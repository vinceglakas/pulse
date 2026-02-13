import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { decrypt } from '@/lib/encryption';

export const maxDuration = 60;

const ULTRON_URL = process.env.ULTRON_URL || 'https://ultron-engine.fly.dev';
const ULTRON_API_SECRET = process.env.ULTRON_API_SECRET || '';

// Service-role Supabase client (lazy init)
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

async function ultronFetch(path: string, body: object, stream = false): Promise<Response> {
  return fetch(`${ULTRON_URL}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${ULTRON_API_SECRET}`,
    },
    body: JSON.stringify(body),
  });
}

async function spawnAgent(userId: string, apiKey: string, provider: string) {
  const res = await ultronFetch('/api/agent/spawn', { userId, apiKey, provider });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Spawn failed (${res.status}): ${text.slice(0, 300)}`);
  }
  return res.json();
}

async function chatWithRetry(
  userId: string,
  message: string,
  sessionKey: string,
  apiKey: string,
  provider: string,
): Promise<Response> {
  let res = await ultronFetch('/api/agent/chat', { userId, message, sessionKey });

  // If agent not running, respawn and retry once
  if (res.status === 404) {
    await spawnAgent(userId, apiKey, provider);
    await new Promise((r) => setTimeout(r, 2000));
    res = await ultronFetch('/api/agent/chat', { userId, message, sessionKey });
  }

  return res;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { message, sessionKey: sk, preferredProvider } = body;
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

    // Get API key(s)
    const { data: allKeysRaw } = await supabase
      .from('api_keys' as any)
      .select('id, provider, encrypted_key')
      .eq('user_id', userId);
    const allKeys = allKeysRaw as any[] | null;

    if (!allKeys || allKeys.length === 0) {
      return new Response(JSON.stringify({ error: 'No API key configured. Add one at /settings/keys' }), {
        status: 400, headers: { 'Content-Type': 'application/json' },
      });
    }

    // Pick key
    let keyRow = allKeys[0];
    if (preferredProvider) {
      const match = allKeys.find((k: any) => k.provider === preferredProvider);
      if (match) keyRow = match;
    }

    let apiKey: string;
    try {
      apiKey = decrypt(keyRow.encrypted_key);
    } catch {
      return new Response(JSON.stringify({ error: 'Failed to decrypt API key. Try re-adding your key.' }), {
        status: 500, headers: { 'Content-Type': 'application/json' },
      });
    }

    const provider = keyRow.provider;

    // Ensure agent is spawned (idempotent)
    await spawnAgent(userId, apiKey, provider);

    // Chat with retry
    const ultronRes = await chatWithRetry(userId, message, sessionKey, apiKey, provider);

    if (!ultronRes.ok) {
      const errText = await ultronRes.text();
      return new Response(JSON.stringify({ error: `Agent error (${ultronRes.status}): ${errText.slice(0, 300)}` }), {
        status: 502, headers: { 'Content-Type': 'application/json' },
      });
    }

    // Stream SSE from Ultron back to frontend (already in our format after Ultron transform)
    const reader = ultronRes.body?.getReader();
    if (!reader) {
      return new Response(JSON.stringify({ error: 'No response stream' }), {
        status: 502, headers: { 'Content-Type': 'application/json' },
      });
    }

    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    const stream = new ReadableStream({
      async start(controller) {
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            controller.enqueue(value);
          }
        } catch (e: any) {
          console.error('Ultron stream error:', e.message);
        }
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
