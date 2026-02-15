import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  // Admin-only: check Ultron secret
  const secret = req.headers.get('x-ultron-secret')
  if (secret !== process.env.ULTRON_API_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const results: any[] = []

  // Create monitor_alerts if not exists - using individual inserts to test
  try {
    // Try to select from monitor_alerts - if it fails, table doesn't exist
    const { error } = await supabase.from('monitor_alerts').select('id').limit(1)
    if (error?.code === 'PGRST204' || error?.code === '42P01' || error?.message?.includes('not find')) {
      results.push({ table: 'monitor_alerts', status: 'needs_creation', error: error.message })
    } else {
      results.push({ table: 'monitor_alerts', status: 'exists' })
    }
  } catch (e: any) {
    results.push({ table: 'monitor_alerts', error: e.message })
  }

  // Create agent_messages if not exists
  try {
    const { error } = await supabase.from('agent_messages').select('id').limit(1)
    if (error) {
      results.push({ table: 'agent_messages', status: 'needs_creation', error: error.message })
    } else {
      results.push({ table: 'agent_messages', status: 'exists' })
    }
  } catch (e: any) {
    results.push({ table: 'agent_messages', error: e.message })
  }

  return NextResponse.json({ results, note: 'Run the SQL in migrations/monitor_alerts.sql via Supabase Dashboard SQL Editor' })
}
