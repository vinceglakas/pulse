import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const ULTRON_SECRET = (process.env.ULTRON_API_SECRET || '').trim();
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-ultron-secret');
  if (!secret || secret !== ULTRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { userId, action, artifact, artifactId, updates } = await req.json();
  if (!userId || !action) {
    return NextResponse.json({ error: 'userId and action required' }, { status: 400 });
  }

  if (action === 'list') {
    const { data, error } = await supabaseAdmin
      .from('artifacts')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });
    return NextResponse.json({ artifacts: data || [] });
  }

  if (action === 'create') {
    if (!artifact?.name || !artifact?.type) {
      return NextResponse.json({ error: 'artifact.name and artifact.type required' }, { status: 400 });
    }
    const { data, error } = await supabaseAdmin
      .from('artifacts')
      .insert({
        user_id: userId,
        name: artifact.name,
        type: artifact.type,
        icon: artifact.icon || null,
        description: artifact.description || null,
        schema: { columns: artifact.columns || [] },
        data: artifact.rows || [],
        group_by: artifact.groupBy || null,
        content: artifact.content || null,
      })
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ artifact: data }, { status: 201 });
  }

  if (action === 'update') {
    if (!artifactId) return NextResponse.json({ error: 'artifactId required' }, { status: 400 });
    const dbUpdates: any = { updated_at: new Date().toISOString() };
    if (updates?.name) dbUpdates.name = updates.name;
    if (updates?.columns) dbUpdates.schema = { columns: updates.columns };
    if (updates?.rows) dbUpdates.data = updates.rows;
    if (updates?.content) dbUpdates.content = updates.content;
    if (updates?.description) dbUpdates.description = updates.description;

    const { data, error } = await supabaseAdmin
      .from('artifacts')
      .update(dbUpdates)
      .eq('id', artifactId)
      .eq('user_id', userId)
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ artifact: data });
  }

  if (action === 'delete') {
    if (!artifactId) return NextResponse.json({ error: 'artifactId required' }, { status: 400 });
    await supabaseAdmin.from('artifacts').delete().eq('id', artifactId).eq('user_id', userId);
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
