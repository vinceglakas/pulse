import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

const FREE_LIMIT = 3

/**
 * GET /api/quota?fp=<fingerprint>
 * Returns { used, limit, remaining }
 */
export async function GET(request: NextRequest) {
  const fp = request.nextUrl.searchParams.get('fp')
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'

  // Count searches this month for this fingerprint OR IP
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

  let used = 0

  if (fp) {
    // Check by fingerprint (stored in ip_address field as fp:<hash>)
    const { count } = await supabase
      .from('search_usage')
      .select('*', { count: 'exact', head: true })
      .eq('ip_address', `fp:${fp}`)
      .gte('created_at', monthStart)

    used = count || 0
  }

  // Also check by IP as fallback
  if (used === 0) {
    const { count } = await supabase
      .from('search_usage')
      .select('*', { count: 'exact', head: true })
      .eq('ip_address', ip)
      .gte('created_at', monthStart)

    used = count || 0
  }

  // Check for referral bonus searches
  let bonusSearches = 0
  const identifier = fp ? `fp:${fp}` : ip
  try {
    const { data: bonusRow } = await supabase
      .from('referral_bonuses')
      .select('bonus_searches')
      .eq('user_id', identifier)
      .single()
    bonusSearches = bonusRow?.bonus_searches || 0
  } catch { /* no bonus row */ }

  const totalLimit = FREE_LIMIT + bonusSearches

  return NextResponse.json({
    used,
    limit: totalLimit,
    remaining: Math.max(0, totalLimit - used),
    bonus_searches: bonusSearches,
  })
}
