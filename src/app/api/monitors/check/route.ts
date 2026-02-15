import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getUserFromRequest } from '@/lib/server-auth'

const BRAVE_API_KEY = (process.env.BRAVE_API_KEY || '').trim()

async function searchBrave(query: string): Promise<{ title: string; url: string; snippet: string; age?: string }[]> {
  if (!BRAVE_API_KEY) return []
  try {
    const res = await fetch(`https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=10&freshness=pw`, {
      headers: { 'X-Subscription-Token': BRAVE_API_KEY, Accept: 'application/json' },
      signal: AbortSignal.timeout(10000),
    })
    if (!res.ok) return []
    const data = await res.json()
    return (data.web?.results || []).map((r: any) => ({
      title: r.title,
      url: r.url,
      snippet: r.description,
      age: r.age,
    }))
  } catch { return [] }
}

async function checkMonitor(monitor: any): Promise<{ newResults: any[]; allResults: any[] }> {
  const searchQuery = [monitor.topic, ...(monitor.keywords || [])].join(' ')
  const results = await searchBrave(searchQuery)
  
  const previousUrls = new Set((monitor.last_results || []).map((r: any) => r.url))
  const newResults = results.filter(r => !previousUrls.has(r.url))
  
  return { newResults, allResults: results }
}

// POST — Check a single monitor (manual "Check Now")
export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { monitorId } = body
  if (!monitorId) return NextResponse.json({ error: 'Missing monitorId' }, { status: 400 })

  const { data: monitor, error } = await supabase
    .from('monitors')
    .select('*')
    .eq('id', monitorId)
    .eq('user_id', user.id)
    .single()

  if (error || !monitor) return NextResponse.json({ error: 'Monitor not found' }, { status: 404 })

  const { newResults, allResults } = await checkMonitor(monitor)

  // Create alerts + notifications if new results found
  if (newResults.length > 0) {
    const alertTitle = `${newResults.length} new result${newResults.length > 1 ? 's' : ''} for "${monitor.topic}"`
    const alertBody = newResults.slice(0, 5).map(r => `• ${r.title}\n  ${r.url}`).join('\n\n')

    await Promise.all([
      supabase.from('notifications').insert({
        user_id: user.id, monitor_id: monitor.id,
        title: `🔔 ${alertTitle}`, body: alertBody,
      }),
      supabase.from('monitor_alerts').insert(
        newResults.slice(0, 10).map(r => ({
          user_id: user.id, monitor_id: monitor.id,
          title: r.title, body: r.snippet, topic: monitor.topic,
          url: r.url, source: 'brave', severity: 'info',
        }))
      ),
    ])
  }

  // Update last checked + store results
  await supabase.from('monitors').update({
    last_checked: new Date().toISOString(),
    last_results: allResults,
  }).eq('id', monitor.id)

  return NextResponse.json({
    checked: true,
    newResults: newResults.length,
    totalResults: allResults.length,
    notification: newResults.length > 0,
  })
}

// GET — Cron endpoint: checks ALL active monitors
export async function GET() {
  const { data: monitors, error } = await supabase
    .from('monitors')
    .select('*')
    .eq('enabled', true)

  if (error || !monitors) return NextResponse.json({ error: 'Failed to fetch monitors' }, { status: 500 })

  let alertsSent = 0

  for (const monitor of monitors) {
    const { newResults, allResults } = await checkMonitor(monitor)

    if (newResults.length >= (monitor.alert_threshold || 1)) {
      const alertTitle = `${newResults.length} new result${newResults.length > 1 ? 's' : ''} for "${monitor.topic}"`
      await Promise.all([
        supabase.from('notifications').insert({
          user_id: monitor.user_id, monitor_id: monitor.id,
          title: `🔔 ${alertTitle}`,
          body: newResults.slice(0, 5).map(r => `• ${r.title}\n  ${r.url}`).join('\n\n'),
        }),
        supabase.from('monitor_alerts').insert(
          newResults.slice(0, 10).map(r => ({
            user_id: monitor.user_id, monitor_id: monitor.id,
            title: r.title, body: r.snippet, topic: monitor.topic,
            url: r.url, source: 'brave', severity: 'info',
          }))
        ),
      ])
      alertsSent++
    }

    await supabase.from('monitors').update({
      last_checked: new Date().toISOString(),
      last_results: allResults,
    }).eq('id', monitor.id)
  }

  return NextResponse.json({ checked: monitors.length, alertsSent })
}
