import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

/**
 * GET /api/referrals/status?fp=<fingerprint>
 * Returns referral code, referral count, and bonus searches remaining.
 */
export async function GET(request: NextRequest) {
  const fp = request.nextUrl.searchParams.get('fp')
  if (!fp) {
    return NextResponse.json({ error: 'fp is required' }, { status: 400 })
  }

  const userId = `fp:${fp}`

  // Get referral code
  const { data: codeRow } = await supabase
    .from('referrals')
    .select('referrer_code')
    .eq('referrer_id', userId)
    .limit(1)
    .single()

  // Count successful referrals
  const { count: referralCount } = await supabase
    .from('referrals')
    .select('*', { count: 'exact', head: true })
    .eq('referrer_id', userId)
    .eq('bonus_applied', true)

  // Get bonus searches
  const { data: bonusRow } = await supabase
    .from('referral_bonuses')
    .select('bonus_searches')
    .eq('user_id', userId)
    .single()

  // Get used searches this month
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const { count: usedCount } = await supabase
    .from('search_usage')
    .select('*', { count: 'exact', head: true })
    .eq('ip_address', userId)
    .gte('created_at', monthStart)

  const bonusSearches = bonusRow?.bonus_searches || 0
  const used = usedCount || 0
  const totalLimit = 3 + bonusSearches

  return NextResponse.json({
    code: codeRow?.referrer_code || null,
    referrals: referralCount || 0,
    bonus_searches: bonusSearches,
    used,
    limit: totalLimit,
    remaining: Math.max(0, totalLimit - used),
  })
}
