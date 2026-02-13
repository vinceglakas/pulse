import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Table schema (run in Supabase SQL editor):
// CREATE TABLE IF NOT EXISTS automations (
//   id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
//   user_id uuid REFERENCES auth.users(id) NOT NULL,
//   name text NOT NULL,
//   prompt text NOT NULL,
//   schedule_type text NOT NULL DEFAULT 'daily',
//   schedule_config jsonb NOT NULL DEFAULT '{}',
//   delivery text NOT NULL DEFAULT 'web',
//   active boolean NOT NULL DEFAULT true,
//   last_run_at timestamptz,
//   next_run_at timestamptz,
//   created_at timestamptz DEFAULT now(),
//   updated_at timestamptz DEFAULT now()
// );
// CREATE INDEX idx_automations_user_id ON automations(user_id);

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

async function getUser(req: NextRequest) {
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

// GET: list user's automations
export async function GET(req: NextRequest) {
  const user = await getUser(req);
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('automations')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ automations: data || [] });
  } catch (error: any) {
    // Table might not exist yet
    if (error?.code === '42P01') {
      return NextResponse.json({ automations: [] });
    }
    console.error('List automations error:', error);
    return NextResponse.json({ error: 'Failed to list automations' }, { status: 500 });
  }
}

// POST: create new automation
export async function POST(req: NextRequest) {
  const user = await getUser(req);
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { name, prompt, schedule_type, schedule_config, delivery } = body;

    if (!name?.trim() || !prompt?.trim()) {
      return NextResponse.json({ error: 'Name and prompt are required' }, { status: 400 });
    }

    const validTypes = ['daily', 'weekly', 'custom'];
    const validDelivery = ['web', 'telegram', 'discord'];

    const { data, error } = await supabaseAdmin
      .from('automations')
      .insert({
        user_id: user.id,
        name: name.trim(),
        prompt: prompt.trim(),
        schedule_type: validTypes.includes(schedule_type) ? schedule_type : 'daily',
        schedule_config: schedule_config || {},
        delivery: validDelivery.includes(delivery) ? delivery : 'web',
        active: true,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ automation: data }, { status: 201 });
  } catch (error: any) {
    console.error('Create automation error:', error);
    return NextResponse.json({ error: 'Failed to create automation' }, { status: 500 });
  }
}

// PATCH: update automation (toggle active/pause, edit fields)
export async function PATCH(req: NextRequest) {
  const user = await getUser(req);
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: 'Automation id is required' }, { status: 400 });
    }

    // Only allow certain fields to be updated
    const allowed: Record<string, any> = {};
    if (typeof updates.active === 'boolean') allowed.active = updates.active;
    if (updates.name?.trim()) allowed.name = updates.name.trim();
    if (updates.prompt?.trim()) allowed.prompt = updates.prompt.trim();
    if (updates.schedule_type) allowed.schedule_type = updates.schedule_type;
    if (updates.schedule_config) allowed.schedule_config = updates.schedule_config;
    if (updates.delivery) allowed.delivery = updates.delivery;
    allowed.updated_at = new Date().toISOString();

    const { data, error } = await supabaseAdmin
      .from('automations')
      .update(allowed)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ automation: data });
  } catch (error: any) {
    console.error('Update automation error:', error);
    return NextResponse.json({ error: 'Failed to update automation' }, { status: 500 });
  }
}

// DELETE: remove an automation
export async function DELETE(req: NextRequest) {
  const user = await getUser(req);
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    const { id } = await req.json();

    if (!id) {
      return NextResponse.json({ error: 'Automation id is required' }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from('automations')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) throw error;

    return NextResponse.json({ deleted: true });
  } catch (error: any) {
    console.error('Delete automation error:', error);
    return NextResponse.json({ error: 'Failed to delete automation' }, { status: 500 });
  }
}
