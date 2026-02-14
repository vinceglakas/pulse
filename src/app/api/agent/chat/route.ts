import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { decrypt } from '@/lib/encryption';

export const maxDuration = 120;

const ULTRON_URL = (process.env.ULTRON_URL || 'https://ultron-engine.fly.dev').trim();
const ULTRON_API_SECRET = (process.env.ULTRON_API_SECRET || '').trim();

let _supabase: ReturnType<typeof createClient> | null = null;
function getSupabase() {
  if (!_supabase) {
    _supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || '',
    );
  }
  return _supabase;
}

const SSE_HEADERS = {
  'Content-Type': 'text/event-stream',
  'Cache-Control': 'no-cache, no-transform',
  Connection: 'keep-alive',
  'X-Accel-Buffering': 'no',
};

const encoder = new TextEncoder();

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { message, sessionKey: sk } = body;
    const sessionKey = sk || 'default';

    if (!message || typeof message !== 'string') {
      return new Response(JSON.stringify({ error: 'Message is required' }), {
        status: 400, headers: { 'Content-Type': 'application/json' },
      });
    }

    // Auth
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Not authenticated' }), {
        status: 401, headers: { 'Content-Type': 'application/json' },
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
        status: 401, headers: { 'Content-Type': 'application/json' },
      });
    }

    const userId = user.id;
    const supabase = getSupabase();

    // Load API key + profile
    const [keysRes, profileRes] = await Promise.all([
      supabase.from('api_keys' as any).select('id, provider, encrypted_key').eq('user_id', userId),
      supabase.from('profiles').select('full_name, role, industry, current_focus, plan').eq('id', userId).single(),
    ]);

    const allKeys = (keysRes.data || []) as any[];
    const profile = profileRes.data as any;

    if (allKeys.length === 0) {
      return new Response(JSON.stringify({ error: 'No API key configured. Add one at /settings/keys' }), {
        status: 400, headers: { 'Content-Type': 'application/json' },
      });
    }

    const keyRow = allKeys[0];
    let apiKey: string;
    try {
      apiKey = decrypt(keyRow.encrypted_key);
    } catch {
      return new Response(JSON.stringify({ error: 'Failed to decrypt API key. Try re-adding your key.' }), {
        status: 500, headers: { 'Content-Type': 'application/json' },
      });
    }
    const provider = keyRow.provider;

    // Load conversation history
    let history: Array<{ role: string; content: string }> = [];
    try {
      const historyRes = await supabase.from('agent_messages' as any)
        .select('role, content')
        .eq('user_id', userId)
        .eq('session_key', sessionKey)
        .order('created_at', { ascending: true })
        .limit(30);
      history = ((historyRes as any).data || []).map((h: any) => ({
        role: h.role === 'assistant' || h.role === 'agent' ? 'assistant' : 'user',
        content: h.content,
      })).filter((h: any) => h.content?.trim());
    } catch {}

    // Save user message to history
    try {
      await (supabase.from('agent_messages' as any).insert({
        user_id: userId, session_key: sessionKey, role: 'user', content: message,
      } as any) as any);
    } catch {}

    // Ensure agent is spawned on Ultron (with retry for Fly.io cold starts)
    const spawnBody = JSON.stringify({
      userId,
      apiKey,
      provider,
      userContext: {
        name: profile?.full_name,
        role: profile?.role,
        industry: profile?.industry,
        currentFocus: profile?.current_focus,
        plan: profile?.plan,
      },
    });

    let spawnOk = false;
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const spawnRes = await fetch(`${ULTRON_URL}/api/agent/spawn`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${ULTRON_API_SECRET}`,
          },
          body: spawnBody,
          signal: AbortSignal.timeout(attempt === 0 ? 45000 : 60000),
        });

        if (spawnRes.ok) {
          spawnOk = true;
          break;
        }
        const err = await spawnRes.text();
        console.error(`Ultron spawn attempt ${attempt + 1} failed:`, err);
      } catch (err: any) {
        console.error(`Ultron spawn attempt ${attempt + 1} error:`, err.message);
      }
      // Wait before retry (Fly.io VM might be waking up)
      if (attempt === 0) await new Promise(r => setTimeout(r, 3000));
    }

    if (!spawnOk) {
      return new Response(JSON.stringify({ error: 'AI engine unavailable. Please try again in a moment.' }), {
        status: 502, headers: { 'Content-Type': 'application/json' },
      });
    }

    // Send chat through Ultron
    let upstream: globalThis.Response;
    try {
      upstream = await fetch(`${ULTRON_URL}/api/agent/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${ULTRON_API_SECRET}`,
        },
        body: JSON.stringify({ userId, message, sessionKey, history }),
        signal: AbortSignal.timeout(90000),
      });

      if (!upstream.ok) {
        const err = await upstream.text();
        console.error('Ultron chat error:', err);
        return new Response(JSON.stringify({ error: 'Agent error. Please try again.' }), {
          status: 502, headers: { 'Content-Type': 'application/json' },
        });
      }
    } catch (err: any) {
      console.error('Ultron chat failed:', err.message);
      return new Response(JSON.stringify({ error: 'AI engine timeout. Please try again.' }), {
        status: 502, headers: { 'Content-Type': 'application/json' },
      });
    }

    // Stream Ultron's SSE response through to the frontend
    const stream = new ReadableStream({
      async start(controller) {
        let fullText = '';
        const reader = upstream.body?.getReader();
        if (!reader) {
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
          return;
        }

        const decoder = new TextDecoder();
        let buffer = '';

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
              if (!line.startsWith('data: ')) continue;
              const data = line.slice(6).trim();
              if (!data) continue;

              // Pass through SSE events as-is (Ultron already formats them for Pulsed)
              controller.enqueue(encoder.encode(`data: ${data}\n\n`));

              // Accumulate text for history saving
              if (data !== '[DONE]') {
                try {
                  const parsed = JSON.parse(data);
                  if (parsed.text) fullText += parsed.text;
                } catch {}
              }
            }
          }

          // Handle remaining buffer
          if (buffer.startsWith('data: ')) {
            const data = buffer.slice(6).trim();
            if (data) {
              controller.enqueue(encoder.encode(`data: ${data}\n\n`));
              if (data !== '[DONE]') {
                try {
                  const parsed = JSON.parse(data);
                  if (parsed.text) fullText += parsed.text;
                } catch {}
              }
            }
          }
        } catch (err: any) {
          console.error('Stream error:', err.message);
        }

        // Save assistant response
        if (fullText.trim()) {
          try {
            await (supabase.from('agent_messages' as any).insert({
              user_id: userId, session_key: sessionKey, role: 'assistant', content: fullText.trim(),
            } as any) as any);
          } catch {}
        }

        // Ensure [DONE] is sent
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      },
    });

    return new Response(stream, { headers: SSE_HEADERS });

  } catch (error: any) {
    console.error('Agent chat error:', error);
    return new Response(JSON.stringify({ error: error.message || 'Internal error' }), {
      status: 500, headers: { 'Content-Type': 'application/json' },
    });
  }
}
