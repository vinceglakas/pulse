import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/server-auth'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const now = new Date()
  const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()

  // Parallel fetch with graceful failure for missing tables
  const safeFetch = (query: any) => query.then((r: any) => r).catch(() => ({ data: null, error: true }))
  const [alertsRes, dealsRes, activitiesRes, briefsRes, notifRes] = await Promise.all([
    safeFetch(supabase.from('monitor_alerts').select('*').eq('user_id', user.id).gte('created_at', dayStart).order('created_at', { ascending: false }).limit(10)),
    safeFetch(supabase.from('deals').select('*').eq('user_id', user.id).order('updated_at', { ascending: false }).limit(5)),
    safeFetch(supabase.from('activities').select('*').eq('user_id', user.id).gte('created_at', dayStart).order('created_at', { ascending: false }).limit(10)),
    safeFetch(supabase.from('research_briefs').select('id,topic,created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(5)),
    safeFetch(supabase.from('notifications').select('*').eq('user_id', user.id).eq('read', false).order('created_at', { ascending: false }).limit(10)),
  ])

  const alerts = alertsRes.data || []
  const deals = dealsRes.data || []
  const activities = activitiesRes.data || []
  const briefs = briefsRes.data || []
  const notifications = notifRes.data || []

  // Build briefing
  const sections: string[] = []

  if (notifications.length > 0) {
    sections.push(`📬 **${notifications.length} unread notification${notifications.length > 1 ? 's' : ''}**`)
  }

  if (alerts.length > 0) {
    sections.push(`📡 **${alerts.length} monitor alert${alerts.length > 1 ? 's' : ''} today** — ${alerts.slice(0, 3).map((a: any) => a.title || a.topic || 'Alert').join(', ')}`)
  }

  const activeDealCount = deals.filter((d: any) => d.stage !== 'won' && d.stage !== 'lost').length
  const totalPipeline = deals.filter((d: any) => d.stage !== 'won' && d.stage !== 'lost').reduce((sum: number, d: any) => sum + (d.value || 0), 0)
  if (activeDealCount > 0) {
    sections.push(`💰 **${activeDealCount} active deal${activeDealCount > 1 ? 's' : ''}** worth $${totalPipeline.toLocaleString()} in pipeline`)
  }

  if (activities.length > 0) {
    sections.push(`📋 **${activities.length} activit${activities.length > 1 ? 'ies' : 'y'}** logged today`)
  }

  if (briefs.length > 0) {
    sections.push(`🔍 Recent research: ${briefs.slice(0, 3).map((b: any) => b.topic).join(', ')}`)
  }

  const greeting = now.getHours() < 12 ? 'Good morning' : now.getHours() < 17 ? 'Good afternoon' : 'Good evening'
  
  let briefing = ''
  if (sections.length === 0) {
    briefing = `${greeting}! Everything's quiet — no alerts, no pending items. What would you like to work on?`
  } else {
    briefing = `${greeting}! Here's your briefing:\n\n${sections.join('\n')}\n\nWhat would you like to tackle first?`
  }

  return NextResponse.json({
    briefing,
    stats: {
      alerts: alerts.length,
      activeDeals: activeDealCount,
      pipeline: totalPipeline,
      activities: activities.length,
      unreadNotifications: notifications.length,
      recentBriefs: briefs.length,
    },
  })
}
