import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';

const ULTRON_SECRET = (process.env.ULTRON_API_SECRET || '').trim();
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

function ensureRowIds(rows: any[]): any[] {
  if (!Array.isArray(rows)) return [];
  return rows.map((row, i) => ({
    ...row,
    id: row.id || randomUUID(),
  }));
}

async function getArtifact(userId: string, artifactId: string) {
  const { data, error } = await supabaseAdmin
    .from('artifacts')
    .select('*')
    .eq('id', artifactId)
    .eq('user_id', userId)
    .single();
  if (error || !data) return null;
  return data;
}

async function saveData(userId: string, artifactId: string, rows: any[], extra?: Record<string, any>) {
  const updates: any = { data: rows, updated_at: new Date().toISOString(), ...extra };
  const { data, error } = await supabaseAdmin
    .from('artifacts')
    .update(updates)
    .eq('id', artifactId)
    .eq('user_id', userId)
    .select()
    .single();
  if (error) return { error: error.message };
  return { artifact: data };
}

export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-ultron-secret');
  if (!secret || secret !== ULTRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const { userId, action, artifact, artifactId, updates, row, rows, rowId, column, columnKey, filters } = body;
  if (!userId || !action) {
    return NextResponse.json({ error: 'userId and action required' }, { status: 400 });
  }

  // --- LIST ---
  if (action === 'list') {
    const { data } = await supabaseAdmin
      .from('artifacts')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });
    // Ensure row IDs on read
    const artifacts = (data || []).map((a: any) => ({
      ...a,
      data: ensureRowIds(a.data || []),
    }));
    return NextResponse.json({ artifacts });
  }

  // --- CREATE ---
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
        data: ensureRowIds(artifact.rows || []),
        group_by: artifact.groupBy || null,
        content: artifact.content || null,
      })
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ artifact: data }, { status: 201 });
  }

  // --- UPDATE (full replace) ---
  if (action === 'update') {
    if (!artifactId) return NextResponse.json({ error: 'artifactId required' }, { status: 400 });
    const dbUpdates: any = { updated_at: new Date().toISOString() };
    if (updates?.name) dbUpdates.name = updates.name;
    if (updates?.columns) dbUpdates.schema = { columns: updates.columns };
    if (updates?.rows) dbUpdates.data = ensureRowIds(updates.rows);
    if (updates?.content) dbUpdates.content = updates.content;
    if (updates?.description) dbUpdates.description = updates.description;
    if (updates?.groupBy) dbUpdates.group_by = updates.groupBy;

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

  // --- DELETE artifact ---
  if (action === 'delete') {
    if (!artifactId) return NextResponse.json({ error: 'artifactId required' }, { status: 400 });
    await supabaseAdmin.from('artifacts').delete().eq('id', artifactId).eq('user_id', userId);
    return NextResponse.json({ success: true });
  }

  // --- ADD ROW ---
  if (action === 'add_row') {
    if (!artifactId || !row) return NextResponse.json({ error: 'artifactId and row required' }, { status: 400 });
    const art = await getArtifact(userId, artifactId);
    if (!art) return NextResponse.json({ error: 'Artifact not found' }, { status: 404 });
    const newRow = { ...row, id: randomUUID() };
    const dataArr = ensureRowIds(art.data || []);
    dataArr.push(newRow);
    const result = await saveData(userId, artifactId, dataArr);
    if ('error' in result) return NextResponse.json({ error: result.error }, { status: 500 });
    return NextResponse.json({ row: newRow, artifact: result.artifact }, { status: 201 });
  }

  // --- BULK ADD ROWS ---
  if (action === 'bulk_add_rows') {
    if (!artifactId || !Array.isArray(rows)) return NextResponse.json({ error: 'artifactId and rows[] required' }, { status: 400 });
    const art = await getArtifact(userId, artifactId);
    if (!art) return NextResponse.json({ error: 'Artifact not found' }, { status: 404 });
    const newRows = rows.map((r: any) => ({ ...r, id: randomUUID() }));
    const dataArr = ensureRowIds(art.data || []);
    dataArr.push(...newRows);
    const result = await saveData(userId, artifactId, dataArr);
    if ('error' in result) return NextResponse.json({ error: result.error }, { status: 500 });
    return NextResponse.json({ rows: newRows, artifact: result.artifact }, { status: 201 });
  }

  // --- UPDATE ROW ---
  if (action === 'update_row') {
    if (!artifactId || !rowId || !updates) return NextResponse.json({ error: 'artifactId, rowId, and updates required' }, { status: 400 });
    const art = await getArtifact(userId, artifactId);
    if (!art) return NextResponse.json({ error: 'Artifact not found' }, { status: 404 });
    const dataArr = ensureRowIds(art.data || []);
    const idx = dataArr.findIndex((r: any) => r.id === rowId);
    if (idx === -1) return NextResponse.json({ error: 'Row not found' }, { status: 404 });
    dataArr[idx] = { ...dataArr[idx], ...updates };
    const result = await saveData(userId, artifactId, dataArr);
    if ('error' in result) return NextResponse.json({ error: result.error }, { status: 500 });
    return NextResponse.json({ row: dataArr[idx], artifact: result.artifact });
  }

  // --- DELETE ROW ---
  if (action === 'delete_row') {
    if (!artifactId || !rowId) return NextResponse.json({ error: 'artifactId and rowId required' }, { status: 400 });
    const art = await getArtifact(userId, artifactId);
    if (!art) return NextResponse.json({ error: 'Artifact not found' }, { status: 404 });
    const dataArr = ensureRowIds(art.data || []);
    const filtered = dataArr.filter((r: any) => r.id !== rowId);
    if (filtered.length === dataArr.length) return NextResponse.json({ error: 'Row not found' }, { status: 404 });
    const result = await saveData(userId, artifactId, filtered);
    if ('error' in result) return NextResponse.json({ error: result.error }, { status: 500 });
    return NextResponse.json({ success: true, artifact: result.artifact });
  }

  // --- GET ROW ---
  if (action === 'get_row') {
    if (!artifactId || !rowId) return NextResponse.json({ error: 'artifactId and rowId required' }, { status: 400 });
    const art = await getArtifact(userId, artifactId);
    if (!art) return NextResponse.json({ error: 'Artifact not found' }, { status: 404 });
    const dataArr = ensureRowIds(art.data || []);
    const found = dataArr.find((r: any) => r.id === rowId);
    if (!found) return NextResponse.json({ error: 'Row not found' }, { status: 404 });
    return NextResponse.json({ row: found });
  }

  // --- SEARCH ROWS ---
  if (action === 'search_rows') {
    if (!artifactId) return NextResponse.json({ error: 'artifactId required' }, { status: 400 });
    const art = await getArtifact(userId, artifactId);
    if (!art) return NextResponse.json({ error: 'Artifact not found' }, { status: 404 });
    const dataArr = ensureRowIds(art.data || []);
    if (!filters || Object.keys(filters).length === 0) {
      return NextResponse.json({ rows: dataArr });
    }
    const matched = dataArr.filter((r: any) =>
      Object.entries(filters).every(([key, val]) => {
        const rowVal = String(r[key] || '').toLowerCase();
        const filterVal = String(val).toLowerCase();
        return rowVal.includes(filterVal);
      })
    );
    return NextResponse.json({ rows: matched });
  }

  // --- ADD COLUMN ---
  if (action === 'add_column') {
    if (!artifactId || !column?.key || !column?.label) {
      return NextResponse.json({ error: 'artifactId and column (key, label) required' }, { status: 400 });
    }
    const art = await getArtifact(userId, artifactId);
    if (!art) return NextResponse.json({ error: 'Artifact not found' }, { status: 404 });
    const schema = art.schema || { columns: [] };
    if (schema.columns.some((c: any) => c.key === column.key)) {
      return NextResponse.json({ error: 'Column already exists' }, { status: 400 });
    }
    schema.columns.push(column);
    const { data, error } = await supabaseAdmin
      .from('artifacts')
      .update({ schema, updated_at: new Date().toISOString() })
      .eq('id', artifactId)
      .eq('user_id', userId)
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ artifact: data });
  }

  // --- REMOVE COLUMN ---
  if (action === 'remove_column') {
    if (!artifactId || !columnKey) return NextResponse.json({ error: 'artifactId and columnKey required' }, { status: 400 });
    const art = await getArtifact(userId, artifactId);
    if (!art) return NextResponse.json({ error: 'Artifact not found' }, { status: 404 });
    const schema = art.schema || { columns: [] };
    schema.columns = schema.columns.filter((c: any) => c.key !== columnKey);
    // Clean up data
    const dataArr = (art.data || []).map((r: any) => {
      const { [columnKey]: _, ...rest } = r;
      return rest;
    });
    const { data, error } = await supabaseAdmin
      .from('artifacts')
      .update({ schema, data: dataArr, updated_at: new Date().toISOString() })
      .eq('id', artifactId)
      .eq('user_id', userId)
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ artifact: data });
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
