import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

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

function escapeCSVField(val: string): string {
  if (val.includes(',') || val.includes('"') || val.includes('\n')) {
    return `"${val.replace(/"/g, '""')}"`;
  }
  return val;
}

export async function GET(req: NextRequest) {
  const user = await getUser(req);
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  const format = searchParams.get('format') || 'csv';

  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const { data: artifact, error } = await supabaseAdmin
    .from('artifacts')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (error || !artifact) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const columns = artifact.schema?.columns || [];
  const rows = artifact.data || [];
  const safeName = (artifact.name || 'export').replace(/[^a-zA-Z0-9_\- ]/g, '');

  if (format === 'csv') {
    const headerRow = columns.map((c: any) => escapeCSVField(c.label || c.key)).join(',');
    const dataRows = rows.map((row: any) =>
      columns.map((c: any) => escapeCSVField(String(row[c.key] ?? ''))).join(',')
    );
    const csv = [headerRow, ...dataRows].join('\n');

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${safeName}.csv"`,
      },
    });
  }

  if (format === 'pdf') {
    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${safeName}</title>
  <style>
    @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 40px; color: #1a1a2e; }
    h1 { font-size: 22px; margin-bottom: 4px; }
    .meta { color: #666; font-size: 13px; margin-bottom: 24px; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    th { background: #f0f0f5; text-align: left; padding: 8px 12px; border: 1px solid #ddd; font-weight: 600; }
    td { padding: 8px 12px; border: 1px solid #ddd; }
    tr:nth-child(even) { background: #fafafa; }
  </style>
</head>
<body>
  <h1>${artifact.name || 'Untitled'}</h1>
  <div class="meta">${rows.length} rows &middot; Exported ${new Date().toLocaleDateString()}</div>
  <table>
    <thead><tr>${columns.map((c: any) => `<th>${c.label || c.key}</th>`).join('')}</tr></thead>
    <tbody>${rows.map((row: any) =>
      `<tr>${columns.map((c: any) => `<td>${String(row[c.key] ?? '')}</td>`).join('')}</tr>`
    ).join('')}</tbody>
  </table>
</body>
</html>`;

    return new NextResponse(html, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }

  return NextResponse.json({ error: 'Invalid format. Use csv or pdf.' }, { status: 400 });
}
