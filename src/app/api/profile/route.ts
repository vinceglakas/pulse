import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

async function authenticateUser(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader) return null;

  const userSupabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: authHeader } } }
  );

  const { data: { user }, error } = await userSupabase.auth.getUser();
  if (error || !user) return null;
  return user;
}

export async function GET(req: NextRequest) {
  const user = await authenticateUser(req);
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('plan, stripe_customer_id, name, agent_name, role, industry, current_focus, brain_model, worker_model, subagent_model, heartbeat_model, fallback_models')
    .eq('id', user.id)
    .single();

  return NextResponse.json({
    id: user.id,
    email: user.email,
    plan: profile?.plan || 'free',
    name: profile?.name || '',
    agent_name: profile?.agent_name || '',
    role: profile?.role || '',
    industry: profile?.industry || '',
    current_focus: profile?.current_focus || '',
    brain_model: profile?.brain_model || '',
    worker_model: profile?.worker_model || '',
    subagent_model: profile?.subagent_model || '',
    heartbeat_model: profile?.heartbeat_model || '',
    fallback_models: profile?.fallback_models || [],
  });
}

export async function POST(req: NextRequest) {
  const user = await authenticateUser(req);
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const body = await req.json();

  const allowedFields = [
    'name', 'agent_name', 'role', 'industry', 'current_focus',
    'brain_model', 'worker_model', 'subagent_model', 'heartbeat_model', 'fallback_models',
    'telegram_username', 'discord_username',
  ];

  const updates: Record<string, any> = {};
  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      updates[field] = body[field];
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
  }

  const { error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
