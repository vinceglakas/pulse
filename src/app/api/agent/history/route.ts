import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const userSupabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: authHeader } } }
  );

  const { data: { user }, error } = await userSupabase.auth.getUser();
  if (error || !user) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }

  const sessionKey = req.nextUrl.searchParams.get('sessionKey') || 'default';
  const limit = Math.min(parseInt(req.nextUrl.searchParams.get('limit') || '50'), 200);

  const { data: messages, error: fetchError } = await supabase
    .from('agent_messages')
    .select('id, role, content, created_at')
    .eq('user_id', user.id)
    .eq('session_key', sessionKey)
    .order('created_at', { ascending: true })
    .limit(limit);

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  return NextResponse.json({ messages: messages || [] });
}

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const userSupabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: authHeader } } }
  );

  const { data: { user }, error } = await userSupabase.auth.getUser();
  if (error || !user) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }

  const { role, content, sessionKey } = await req.json();
  if (!role || !content) {
    return NextResponse.json({ error: 'Missing role or content' }, { status: 400 });
  }

  const { error: insertError } = await supabase
    .from('agent_messages')
    .insert({
      user_id: user.id,
      session_key: sessionKey || 'default',
      role,
      content,
    });

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
