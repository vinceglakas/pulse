import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { parseCSV, csvToColumns, csvToRows } from '@/lib/csv-parser';

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

export async function POST(req: NextRequest) {
  const user = await getUser(req);
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const body = await req.json();
  const { csvData, name, type } = body;

  if (!csvData || !name) {
    return NextResponse.json({ error: 'csvData and name are required' }, { status: 400 });
  }

  const parsed = parseCSV(csvData);
  if (parsed.length < 1) {
    return NextResponse.json({ error: 'CSV has no data' }, { status: 400 });
  }

  const headers = parsed[0];
  const dataRows = parsed.slice(1);
  const columns = csvToColumns(headers, dataRows);
  const rows = csvToRows(headers, dataRows, columns);

  const { data, error } = await supabaseAdmin
    .from('artifacts')
    .insert({
      user_id: user.id,
      name,
      type: type || 'table',
      icon: 'table',
      schema: { columns },
      data: rows,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ artifact: data }, { status: 201 });
}
