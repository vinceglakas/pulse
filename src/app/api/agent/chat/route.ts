import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { decrypt } from '@/lib/encryption';

const ULTRON_URL = process.env.ULTRON_URL || 'https://ultron-engine.fly.dev';
const ULTRON_SECRET = process.env.ULTRON_API_SECRET || '';

export async function POST(req: NextRequest) {
  try {
    const { message, sessionKey } = await req.json();

    if (!message || typeof message !== 'string') {
      return new Response(JSON.stringify({ error: 'Message is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Get user from auth header (Supabase JWT)
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Not authenticated' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
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

    // Check plan — agent chat requires 'agent' or 'ultra' plan
    const { data: profile } = await supabase
      .from('profiles')
      .select('plan')
      .eq('id', userId)
      .single();

    const plan = profile?.plan || 'free';
    if (plan !== 'agent' && plan !== 'ultra') {
      return new Response(JSON.stringify({ error: 'Agent requires an Agent or Ultra plan. Upgrade at /pricing' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Get user's API key (use service role to read encrypted keys)
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

    const apiKey = decrypt(keys.encrypted_key);
    const provider = keys.provider;

    // Check if agent is already running
    const statusRes = await fetch(`${ULTRON_URL}/api/agent/status/${userId}`, {
      headers: { Authorization: `Bearer ${ULTRON_SECRET}` },
    });
    const statusData = await statusRes.json();

    // Spawn agent if not running
    if (!statusData.running) {
      const spawnRes = await fetch(`${ULTRON_URL}/api/agent/spawn`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${ULTRON_SECRET}`,
        },
        body: JSON.stringify({ userId, apiKey, provider }),
      });

      if (!spawnRes.ok) {
        const err = await spawnRes.json().catch(() => ({ error: 'Spawn failed' }));
        return new Response(JSON.stringify({ error: err.error || 'Failed to start agent' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      // Give agent a moment to start
      await new Promise((r) => setTimeout(r, 3000));
    }

    // Proxy chat to Ultron backend
    const chatRes = await fetch(`${ULTRON_URL}/api/agent/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ULTRON_SECRET}`,
      },
      body: JSON.stringify({ userId, message, sessionKey }),
    });

    if (!chatRes.ok) {
      const err = await chatRes.text();
      return new Response(JSON.stringify({ error: err || 'Chat failed' }), {
        status: chatRes.status,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Stream SSE response back to client
    const reader = chatRes.body?.getReader();
    if (!reader) {
      return new Response(JSON.stringify({ error: 'No response body' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const stream = new ReadableStream({
      async pull(controller) {
        const { done, value } = await reader.read();
        if (done) {
          controller.close();
          return;
        }
        controller.enqueue(value);
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (error: any) {
    console.error('Agent chat error:', error);
    return new Response(JSON.stringify({ error: error.message || 'Internal error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
