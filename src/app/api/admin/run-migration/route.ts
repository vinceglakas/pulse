import { NextRequest, NextResponse } from 'next/server'
import postgres from 'postgres'

// This route runs SQL migrations using a direct database connection.
// Protected by ULTRON_API_SECRET.
// After running successfully, this route can be deleted.

export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-ultron-secret')
  if (secret !== process.env.ULTRON_API_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { sql: sqlText } = await req.json()
  if (!sqlText) {
    return NextResponse.json({ error: 'sql field required' }, { status: 400 })
  }

  // Build connection string from Supabase URL
  // Supabase direct connection: postgresql://postgres.[ref]:[password]@db.[ref].supabase.co:5432/postgres
  const dbUrl = process.env.DATABASE_URL
  if (!dbUrl) {
    return NextResponse.json({ error: 'DATABASE_URL not set. Add it to environment variables.' }, { status: 500 })
  }

  const sql = postgres(dbUrl, { ssl: 'require', max: 1 })
  
  try {
    const result = await sql.unsafe(sqlText)
    await sql.end()
    return NextResponse.json({ success: true, result })
  } catch (err: any) {
    await sql.end()
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
