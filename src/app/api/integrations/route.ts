import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { encrypt, decrypt } from '@/lib/encryption';

function getUserFromAuth(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader) return null;

  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: authHeader } } }
  );
}

export async function GET(req: NextRequest) {
  const userSupabase = getUserFromAuth(req);
  if (!userSupabase) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { data: { user }, error } = await userSupabase.auth.getUser();
  if (error || !user) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }

  // Get integrations from integrations table
  const { data: rows } = await supabase
    .from('integrations')
    .select('integration_id, encrypted_config')
    .eq('user_id', user.id);

  const configs: Record<string, Record<string, string>> = {};
  if (rows) {
    for (const row of rows) {
      try {
        const decrypted = decrypt(row.encrypted_config);
        configs[row.integration_id] = JSON.parse(decrypted);
      } catch {
        configs[row.integration_id] = {};
      }
    }
  }

  return NextResponse.json({ configs });
}

export async function POST(req: NextRequest) {
  const userSupabase = getUserFromAuth(req);
  if (!userSupabase) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { data: { user }, error } = await userSupabase.auth.getUser();
  if (error || !user) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }

  // Check plan
  const { data: profile } = await supabase
    .from('profiles')
    .select('plan')
    .eq('id', user.id)
    .single();

  if (profile?.plan !== 'ultra') {
    return NextResponse.json({ error: 'Ultra plan required for integrations' }, { status: 403 });
  }

  const { integrationId, config } = await req.json();
  if (!integrationId || !config) {
    return NextResponse.json({ error: 'Missing integrationId or config' }, { status: 400 });
  }

  const encrypted = encrypt(JSON.stringify(config));

  // Upsert integration config
  const { error: upsertError } = await supabase
    .from('integrations')
    .upsert(
      {
        user_id: user.id,
        integration_id: integrationId,
        encrypted_config: encrypted,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,integration_id' }
    );

  if (upsertError) {
    console.error('Integration save error:', upsertError);
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
