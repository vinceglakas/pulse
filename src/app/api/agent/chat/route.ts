import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { decrypt } from '@/lib/encryption';

const SYSTEM_PROMPT = `You are Pulsed Agent — a sharp, helpful AI assistant built into the Pulsed platform. You help users with market research, competitive analysis, building tools, automating workflows, and anything they need.

Be conversational but substantive. Give real answers, not fluff. Use markdown formatting when it helps (headers, bullets, bold, code blocks). Keep responses focused and actionable.

If the user tells you their name, role, or what they're working on, remember it and personalize your responses.`;

export const maxDuration = 60; // Vercel Pro allows up to 60s

export async function POST(req: NextRequest) {
  try {
    const { message, history } = await req.json();

    if (!message || typeof message !== 'string') {
      return new Response(JSON.stringify({ error: 'Message is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Get user from auth header
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Not authenticated' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const userSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user }, error: authError } = await userSupabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid auth token' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const userId = user.id;

    // Get user's API key
    const { data: keys } = await supabase
      .from('api_keys')
      .select('id, provider, encrypted_key')
      .eq('user_id', userId)
      .limit(1)
      .single();

    if (!keys) {
      return new Response(JSON.stringify({ error: 'No API key configured. Add one at /settings/keys' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    let apiKey: string;
    try {
      apiKey = decrypt(keys.encrypted_key);
    } catch (e: any) {
      console.error('Decryption failed:', e.message);
      return new Response(JSON.stringify({ error: 'Failed to decrypt API key. Try re-adding your key.' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    const provider = keys.provider;

    // Build messages array
    const msgs: Array<{ role: string; content: string }> = [];
    if (history && Array.isArray(history)) {
      for (const msg of history.slice(-20)) {
        if (msg.role && msg.content) {
          msgs.push({ role: msg.role, content: msg.content });
        }
      }
    }
    msgs.push({ role: 'user', content: message });

    // Call LLM with streaming
    if (provider === 'anthropic') {
      const llmRes = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 4096,
          system: SYSTEM_PROMPT,
          messages: msgs,
          stream: true,
        }),
      });

      if (!llmRes.ok) {
        const errText = await llmRes.text();
        console.error('Anthropic error:', llmRes.status, errText);
        return new Response(JSON.stringify({ error: `Anthropic API error (${llmRes.status}): ${errText.slice(0, 300)}` }), {
          status: 502,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      // Pipe the Anthropic SSE stream, transforming to our format
      const encoder = new TextEncoder();
      const decoder = new TextDecoder();
      const reader = llmRes.body!.getReader();

      const stream = new ReadableStream({
        async start(controller) {
          let buffer = '';
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) {
                controller.enqueue(encoder.encode('data: [DONE]\n\n'));
                controller.close();
                return;
              }
              buffer += decoder.decode(value, { stream: true });
              const lines = buffer.split('\n');
              buffer = lines.pop() || '';

              for (const line of lines) {
                if (!line.startsWith('data: ')) continue;
                const data = line.slice(6).trim();
                if (!data || data === '[DONE]') continue;
                try {
                  const parsed = JSON.parse(data);
                  if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: parsed.delta.text })}\n\n`));
                  } else if (parsed.type === 'message_stop') {
                    controller.enqueue(encoder.encode('data: [DONE]\n\n'));
                  }
                } catch {}
              }
            }
          } catch (e: any) {
            console.error('Stream error:', e);
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: '\n\n[Stream error]' })}\n\n`));
            controller.enqueue(encoder.encode('data: [DONE]\n\n'));
            controller.close();
          }
        },
      });

      return new Response(stream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache, no-transform',
          Connection: 'keep-alive',
          'X-Accel-Buffering': 'no',
        },
      });

    } else if (provider === 'openai') {
      const llmRes = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4.1',
          messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...msgs],
          max_tokens: 4096,
          stream: true,
        }),
      });

      if (!llmRes.ok) {
        const errText = await llmRes.text();
        console.error('OpenAI error:', llmRes.status, errText);
        return new Response(JSON.stringify({ error: `OpenAI API error (${llmRes.status}): ${errText.slice(0, 300)}` }), {
          status: 502,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      const encoder = new TextEncoder();
      const decoder = new TextDecoder();
      const reader = llmRes.body!.getReader();

      const stream = new ReadableStream({
        async start(controller) {
          let buffer = '';
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) {
                controller.enqueue(encoder.encode('data: [DONE]\n\n'));
                controller.close();
                return;
              }
              buffer += decoder.decode(value, { stream: true });
              const lines = buffer.split('\n');
              buffer = lines.pop() || '';

              for (const line of lines) {
                if (!line.startsWith('data: ')) continue;
                const data = line.slice(6).trim();
                if (!data || data === '[DONE]') continue;
                try {
                  const parsed = JSON.parse(data);
                  const text = parsed.choices?.[0]?.delta?.content;
                  if (text) {
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`));
                  }
                } catch {}
              }
            }
          } catch (e: any) {
            console.error('Stream error:', e);
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: '\n\n[Stream error]' })}\n\n`));
            controller.enqueue(encoder.encode('data: [DONE]\n\n'));
            controller.close();
          }
        },
      });

      return new Response(stream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache, no-transform',
          Connection: 'keep-alive',
          'X-Accel-Buffering': 'no',
        },
      });

    } else if (provider === 'google') {
      const llmRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:streamGenerateContent?alt=sse&key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
            contents: msgs.map((m) => ({
              role: m.role === 'assistant' ? 'model' : 'user',
              parts: [{ text: m.content }],
            })),
          }),
        }
      );

      if (!llmRes.ok) {
        const errText = await llmRes.text();
        console.error('Google error:', llmRes.status, errText);
        return new Response(JSON.stringify({ error: `Google API error (${llmRes.status}): ${errText.slice(0, 300)}` }), {
          status: 502,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      const encoder = new TextEncoder();
      const decoder = new TextDecoder();
      const reader = llmRes.body!.getReader();

      const stream = new ReadableStream({
        async start(controller) {
          let buffer = '';
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) {
                controller.enqueue(encoder.encode('data: [DONE]\n\n'));
                controller.close();
                return;
              }
              buffer += decoder.decode(value, { stream: true });
              const lines = buffer.split('\n');
              buffer = lines.pop() || '';

              for (const line of lines) {
                if (!line.startsWith('data: ')) continue;
                const data = line.slice(6).trim();
                if (!data) continue;
                try {
                  const parsed = JSON.parse(data);
                  const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
                  if (text) {
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`));
                  }
                } catch {}
              }
            }
          } catch (e: any) {
            console.error('Stream error:', e);
            controller.enqueue(encoder.encode('data: [DONE]\n\n'));
            controller.close();
          }
        },
      });

      return new Response(stream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache, no-transform',
          Connection: 'keep-alive',
          'X-Accel-Buffering': 'no',
        },
      });
    } else {
      return new Response(JSON.stringify({ error: `Unsupported provider: ${provider}` }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  } catch (error: any) {
    console.error('Agent chat error:', error);
    return new Response(JSON.stringify({ error: error.message || 'Internal error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
