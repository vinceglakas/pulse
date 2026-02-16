import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { decrypt } from '@/lib/encryption';

const ULTRON_URL = (process.env.ULTRON_URL || 'https://ultron-engine.fly.dev').replace(/\\n/g, '').trim();
const ULTRON_API_SECRET = (process.env.ULTRON_API_SECRET || '').replace(/\\n/g, '').trim();

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const userSupabase = createClient(
      (process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\\n/g, '').trim(),
      (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').replace(/\\n/g, '').trim(),
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user }, error: authError } = await userSupabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid auth' }, { status: 401 });
    }

    const userId = user.id;
    const supabase = createClient(
      (process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\\n/g, '').trim(),
      (process.env.SUPABASE_SERVICE_ROLE_KEY || '').replace(/\\n/g, '').trim(),
    );

    // Check if agent is already running
    try {
      const statusRes = await fetch(`${ULTRON_URL}/api/agent/status/${userId}`, {
        headers: { Authorization: `Bearer ${ULTRON_API_SECRET}` },
        signal: AbortSignal.timeout(3000),
      });
      const statusData = await statusRes.json();
      if (statusData.running) {
        return NextResponse.json({ ready: true, ultronUrl: ULTRON_URL, ultronSecret: ULTRON_API_SECRET });
      }
    } catch {}

    // Not running — spawn it
    const keysRes = await supabase.from('api_keys' as any).select('provider, encrypted_key').eq('user_id', userId).limit(1);
    const keys = (keysRes.data || []) as any[];
    if (keys.length === 0) {
      return NextResponse.json({ ready: false, error: 'No API key' });
    }

    const apiKey = decrypt(keys[0].encrypted_key);
    const provider = keys[0].provider;

    const profileRes = await supabase.from('profiles').select('full_name, role, industry, current_focus, plan, telegram_chat_id').eq('id', userId).single();
    const profile = profileRes.data as any;

    const spawnRes = await fetch(`${ULTRON_URL}/api/agent/spawn`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ULTRON_API_SECRET}` },
      body: JSON.stringify({
        userId, apiKey, provider,
        userContext: { name: profile?.full_name, role: profile?.role, industry: profile?.industry, currentFocus: profile?.current_focus, plan: profile?.plan },
        telegramChatId: profile?.telegram_chat_id,
      }),
      signal: AbortSignal.timeout(30000),
    });

    if (spawnRes.ok) {
      return NextResponse.json({ ready: true, ultronUrl: ULTRON_URL, ultronSecret: ULTRON_API_SECRET });
    }

    return NextResponse.json({ ready: false, error: 'Spawn failed' });
  } catch (err: any) {
    return NextResponse.json({ ready: false, error: err.message });
  }
}
