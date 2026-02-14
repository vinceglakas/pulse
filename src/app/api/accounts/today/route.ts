import { NextRequest, NextResponse } from 'next/server'
import { getApiUser } from '@/lib/api-auth'

export async function GET(request: NextRequest) {
  try {
    const auth = await getApiUser(request)
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const today = new Date().toISOString().split('T')[0]

    // Get activities with follow-ups due today or overdue
    const { data: activities, error } = await auth.supabase
      .from('account_activities')
      .select('*, accounts(id, name, state, status)')
      .eq('user_id', auth.user.id)
      .not('follow_up_date', 'is', null)
      .lte('follow_up_date', today)
      .order('follow_up_date', { ascending: true })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Group by account, pick most recent activity per account
    const accountMap = new Map<string, { account: any; lastActivity: any; follow_up_date: string }>()
    for (const act of activities || []) {
      const accId = act.accounts?.id
      if (!accId) continue
      const existing = accountMap.get(accId)
      if (!existing || new Date(act.created_at) > new Date(existing.lastActivity.created_at)) {
        accountMap.set(accId, {
          account: act.accounts,
          lastActivity: { type: act.type, summary: act.summary, outcome: act.outcome, created_at: act.created_at },
          follow_up_date: act.follow_up_date,
        })
      }
    }

    return NextResponse.json(Array.from(accountMap.values()))
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
