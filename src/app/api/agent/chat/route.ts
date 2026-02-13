import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { decrypt } from '@/lib/encryption';

const SYSTEM_PROMPT = `You are Pulsed Agent — the AI assistant built into Pulsed, an intelligence platform.

PERSONALITY:
- You're sharp, direct, and genuinely helpful
- You have opinions and make recommendations, not just list options
- You're proactive — suggest next steps without being asked
- You're conversational — not robotic or overly formal
- When someone tells you about their work, remember it and reference it naturally

CAPABILITIES:
- Market research and competitive intelligence
- Data analysis and trend identification
- Content creation (emails, posts, strategies)
- Workflow planning and process design
- Sales research (prospect identification, account mapping)

FORMATTING:
- Use markdown: **bold** for emphasis, headers for sections, bullet points for lists
- Keep responses focused — don't pad with filler
- End with a question or suggestion to keep the conversation moving
- For long responses, use clear section headers

CONTEXT:
- Users bring their own LLM API keys (BYOLLM model)
- The platform also offers research briefs via the Research tab
- Users can connect via web chat, Telegram, or Discord`;

export const maxDuration = 60; // Vercel Pro allows up to 60s

// ---------------------------------------------------------------------------
// Brave Web Search
// ---------------------------------------------------------------------------
const SEARCH_TRIGGERS = [
  'search for', 'look up', 'lookup', 'what\'s happening with',
  'find me', 'find info', 'research', 'latest on', 'news about',
  'what is', 'who is', 'tell me about', 'how to',
];

function shouldSearch(message: string): boolean {
  const lower = message.toLowerCase();
  return SEARCH_TRIGGERS.some((t) => lower.includes(t));
}

function extractSearchQuery(message: string): string {
  // Strip common prefixes to get a cleaner query
  let q = message;
  const prefixes = [
    'search for', 'look up', 'lookup', 'find me', 'find info on',
    'find info about', 'find', 'research', 'latest on', 'news about',
    'tell me about', 'what\'s happening with',
  ];
  const lower = q.toLowerCase();
  for (const p of prefixes) {
    const idx = lower.indexOf(p);
    if (idx !== -1) {
      q = q.slice(idx + p.length).trim();
      break;
    }
  }
  // Remove trailing punctuation
  return q.replace(/[?.!]+$/, '').trim() || message;
}

async function braveSearch(query: string): Promise<string | null> {
  const apiKey = process.env.BRAVE_API_KEY;
  if (!apiKey) return null;

  try {
    const url = `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=5`;
    const res = await fetch(url, {
      headers: { 'X-Subscription-Token': apiKey, Accept: 'application/json' },
    });
    if (!res.ok) {
      console.error('Brave search error:', res.status, await res.text().catch(() => ''));
      return null;
    }
    const data = await res.json();
    const results = (data.web?.results || []).slice(0, 5);
    if (results.length === 0) return null;

    const formatted = results
      .map(
        (r: any, i: number) =>
          `${i + 1}. Title: ${r.title} | URL: ${r.url} | Description: ${r.description || 'N/A'}`,
      )
      .join('\n');

    return `[SEARCH RESULTS for "${query}"]\n${formatted}\n\nUse these search results to inform your response. Cite sources when relevant.`;
  } catch (e: any) {
    console.error('Brave search exception:', e.message);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Supabase helpers
// ---------------------------------------------------------------------------
async function loadHistory(
  userId: string,
  sessionKey: string,
): Promise<Array<{ role: string; content: string }>> {
  try {
    const { data, error } = await supabase
      .from('agent_messages')
      .select('role, content')
      .eq('user_id', userId)
      .eq('session_key', sessionKey)
      .order('created_at', { ascending: true })
      .limit(50);

    if (error) {
      console.error('Failed to load history:', error.message);
      return [];
    }
    return (data || []).map((m: any) => ({ role: m.role, content: m.content }));
  } catch (e: any) {
    console.error('loadHistory exception:', e.message);
    return [];
  }
}

function saveMessage(userId: string, sessionKey: string, role: string, content: string) {
  // Fire-and-forget — don't block the response
  supabase
    .from('agent_messages')
    .insert({ user_id: userId, session_key: sessionKey, role, content })
    .then(({ error }) => {
      if (error) console.error(`Failed to save ${role} message:`, error.message);
    });
}

// ---------------------------------------------------------------------------
// SSE streaming helpers
// ---------------------------------------------------------------------------
const SSE_HEADERS = {
  'Content-Type': 'text/event-stream',
  'Cache-Control': 'no-cache, no-transform',
  Connection: 'keep-alive',
  'X-Accel-Buffering': 'no',
};

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------
export async function POST(req: NextRequest) {
  try {
    const { message, history, sessionKey: rawSessionKey } = await req.json();

    if (!message || typeof message !== 'string') {
      return new Response(JSON.stringify({ error: 'Message is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const sessionKey: string = rawSessionKey || 'default';

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
      { global: { headers: { Authorization: authHeader } } },
    );
    const {
      data: { user },
      error: authError,
    } = await userSupabase.auth.getUser();
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
      return new Response(
        JSON.stringify({ error: 'No API key configured. Add one at /settings/keys' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      );
    }

    let apiKey: string;
    try {
      apiKey = decrypt(keys.encrypted_key);
    } catch (e: any) {
      console.error('Decryption failed:', e.message);
      return new Response(
        JSON.stringify({ error: 'Failed to decrypt API key. Try re-adding your key.' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } },
      );
    }

    const provider = keys.provider;

    // ------------------------------------------------------------------
    // Build conversation messages
    // ------------------------------------------------------------------
    const msgs: Array<{ role: string; content: string }> = [];

    // If the caller sent history, use it; otherwise load from DB
    if (history && Array.isArray(history) && history.length > 0) {
      for (const msg of history.slice(-50)) {
        if (msg.role && msg.content) {
          msgs.push({ role: msg.role, content: msg.content });
        }
      }
    } else {
      const dbHistory = await loadHistory(userId, sessionKey);
      msgs.push(...dbHistory);
    }

    msgs.push({ role: 'user', content: message });

    // ------------------------------------------------------------------
    // Brave web search (if applicable)
    // ------------------------------------------------------------------
    let systemPrompt = SYSTEM_PROMPT;

    if (shouldSearch(message)) {
      const query = extractSearchQuery(message);
      const searchContext = await braveSearch(query);
      if (searchContext) {
        systemPrompt = `${SYSTEM_PROMPT}\n\n${searchContext}`;
      }
    }

    // ------------------------------------------------------------------
    // Save user message to DB (fire-and-forget)
    // ------------------------------------------------------------------
    saveMessage(userId, sessionKey, 'user', message);

    // ------------------------------------------------------------------
    // LLM call + streaming
    // ------------------------------------------------------------------
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
          system: systemPrompt,
          messages: msgs,
          stream: true,
        }),
      });

      if (!llmRes.ok) {
        const errText = await llmRes.text();
        console.error('Anthropic error:', llmRes.status, errText);
        return new Response(
          JSON.stringify({
            error: `Anthropic API error (${llmRes.status}): ${errText.slice(0, 300)}`,
          }),
          { status: 502, headers: { 'Content-Type': 'application/json' } },
        );
      }

      const encoder = new TextEncoder();
      const decoder = new TextDecoder();
      const reader = llmRes.body!.getReader();
      let fullResponse = '';

      const stream = new ReadableStream({
        async start(controller) {
          let buffer = '';
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) {
                controller.enqueue(encoder.encode('data: [DONE]\n\n'));
                controller.close();
                // Save assistant response
                if (fullResponse) saveMessage(userId, sessionKey, 'assistant', fullResponse);
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
                    fullResponse += parsed.delta.text;
                    controller.enqueue(
                      encoder.encode(`data: ${JSON.stringify({ text: parsed.delta.text })}\n\n`),
                    );
                  } else if (parsed.type === 'message_stop') {
                    controller.enqueue(encoder.encode('data: [DONE]\n\n'));
                  }
                } catch {}
              }
            }
          } catch (e: any) {
            console.error('Stream error:', e);
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ text: '\n\n[Stream error]' })}\n\n`),
            );
            controller.enqueue(encoder.encode('data: [DONE]\n\n'));
            controller.close();
            if (fullResponse) saveMessage(userId, sessionKey, 'assistant', fullResponse);
          }
        },
      });

      return new Response(stream, { headers: SSE_HEADERS });

    } else if (provider === 'openai') {
      const llmRes = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4.1',
          messages: [{ role: 'system', content: systemPrompt }, ...msgs],
          max_tokens: 4096,
          stream: true,
        }),
      });

      if (!llmRes.ok) {
        const errText = await llmRes.text();
        console.error('OpenAI error:', llmRes.status, errText);
        return new Response(
          JSON.stringify({
            error: `OpenAI API error (${llmRes.status}): ${errText.slice(0, 300)}`,
          }),
          { status: 502, headers: { 'Content-Type': 'application/json' } },
        );
      }

      const encoder = new TextEncoder();
      const decoder = new TextDecoder();
      const reader = llmRes.body!.getReader();
      let fullResponse = '';

      const stream = new ReadableStream({
        async start(controller) {
          let buffer = '';
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) {
                controller.enqueue(encoder.encode('data: [DONE]\n\n'));
                controller.close();
                if (fullResponse) saveMessage(userId, sessionKey, 'assistant', fullResponse);
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
                    fullResponse += text;
                    controller.enqueue(
                      encoder.encode(`data: ${JSON.stringify({ text })}\n\n`),
                    );
                  }
                } catch {}
              }
            }
          } catch (e: any) {
            console.error('Stream error:', e);
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ text: '\n\n[Stream error]' })}\n\n`),
            );
            controller.enqueue(encoder.encode('data: [DONE]\n\n'));
            controller.close();
            if (fullResponse) saveMessage(userId, sessionKey, 'assistant', fullResponse);
          }
        },
      });

      return new Response(stream, { headers: SSE_HEADERS });

    } else if (provider === 'google') {
      const llmRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:streamGenerateContent?alt=sse&key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            system_instruction: { parts: [{ text: systemPrompt }] },
            contents: msgs.map((m) => ({
              role: m.role === 'assistant' ? 'model' : 'user',
              parts: [{ text: m.content }],
            })),
          }),
        },
      );

      if (!llmRes.ok) {
        const errText = await llmRes.text();
        console.error('Google error:', llmRes.status, errText);
        return new Response(
          JSON.stringify({
            error: `Google API error (${llmRes.status}): ${errText.slice(0, 300)}`,
          }),
          { status: 502, headers: { 'Content-Type': 'application/json' } },
        );
      }

      const encoder = new TextEncoder();
      const decoder = new TextDecoder();
      const reader = llmRes.body!.getReader();
      let fullResponse = '';

      const stream = new ReadableStream({
        async start(controller) {
          let buffer = '';
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) {
                controller.enqueue(encoder.encode('data: [DONE]\n\n'));
                controller.close();
                if (fullResponse) saveMessage(userId, sessionKey, 'assistant', fullResponse);
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
                    fullResponse += text;
                    controller.enqueue(
                      encoder.encode(`data: ${JSON.stringify({ text })}\n\n`),
                    );
                  }
                } catch {}
              }
            }
          } catch (e: any) {
            console.error('Stream error:', e);
            controller.enqueue(encoder.encode('data: [DONE]\n\n'));
            controller.close();
            if (fullResponse) saveMessage(userId, sessionKey, 'assistant', fullResponse);
          }
        },
      });

      return new Response(stream, { headers: SSE_HEADERS });
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
