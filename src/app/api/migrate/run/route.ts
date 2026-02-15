import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// One-time migration endpoint - run CRM + monitors + notifications tables
// Protected by a secret header
export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-migrate-secret')
  if (secret !== process.env.SUPABASE_SERVICE_ROLE_KEY?.slice(0, 20)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Use service role with raw SQL via Supabase's postgres connection
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  const tables = [
    // Contacts
    `CREATE TABLE IF NOT EXISTS contacts (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL,
      name TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      company TEXT,
      title TEXT,
      tags TEXT[] DEFAULT '{}',
      notes TEXT,
      source TEXT,
      last_contacted TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )`,
    // Companies
    `CREATE TABLE IF NOT EXISTS companies (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL,
      name TEXT NOT NULL,
      domain TEXT,
      industry TEXT,
      size TEXT,
      description TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`,
    // Deals
    `CREATE TABLE IF NOT EXISTS deals (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL,
      contact_id UUID,
      company_id UUID,
      title TEXT NOT NULL,
      value NUMERIC DEFAULT 0,
      stage TEXT NOT NULL DEFAULT 'lead',
      probability INT DEFAULT 0,
      expected_close DATE,
      notes TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )`,
    // Activities
    `CREATE TABLE IF NOT EXISTS activities (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL,
      contact_id UUID,
      deal_id UUID,
      type TEXT NOT NULL,
      subject TEXT,
      body TEXT,
      scheduled_at TIMESTAMPTZ,
      completed_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`,
    // Email Templates
    `CREATE TABLE IF NOT EXISTS email_templates (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL,
      name TEXT NOT NULL,
      subject TEXT,
      body TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`,
    // Monitors
    `CREATE TABLE IF NOT EXISTS monitors (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL,
      topic TEXT NOT NULL,
      keywords TEXT[] DEFAULT '{}',
      frequency TEXT NOT NULL DEFAULT 'daily',
      alert_threshold INT DEFAULT 5,
      enabled BOOLEAN DEFAULT true,
      last_checked TIMESTAMPTZ,
      last_results JSONB DEFAULT '[]',
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`,
    // Notifications (check if already exists from prior migration)
    `CREATE TABLE IF NOT EXISTS notifications (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL,
      monitor_id UUID,
      title TEXT NOT NULL,
      body TEXT,
      read BOOLEAN DEFAULT false,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`,
    // Marketplace
    `CREATE TABLE IF NOT EXISTS marketplace_templates (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      author_id UUID NOT NULL,
      author_name TEXT,
      title TEXT NOT NULL,
      description TEXT,
      category TEXT DEFAULT 'workflow',
      config JSONB DEFAULT '{}',
      installs INT DEFAULT 0,
      rating NUMERIC DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`,
  ]

  const results: string[] = []

  for (const sql of tables) {
    // Use supabase rpc or direct insert to test - but we can't run raw DDL via PostgREST
    // Instead, try creating via the supabase client's from() which will tell us if table exists
    const tableName = sql.match(/CREATE TABLE IF NOT EXISTS (\w+)/)?.[1]
    if (tableName) {
      const { error } = await supabase.from(tableName).select('id').limit(1)
      if (error?.code === '42P01') {
        results.push(`❌ ${tableName}: needs manual creation (PostgREST can't run DDL)`)
      } else {
        results.push(`✅ ${tableName}: exists`)
      }
    }
  }

  return NextResponse.json({
    message: 'Migration check complete. Tables that show ❌ need to be created via Supabase Dashboard SQL Editor.',
    results,
    sql_file: 'Copy the contents of /migrations/crm.sql into Supabase Dashboard > SQL Editor > Run',
  })
}
