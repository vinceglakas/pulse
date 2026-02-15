import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

const PRO_LIMIT = 999999 // Effectively unlimited for Pro users

/**
 * GET /api/quota?fp=<fingerprint>
 * Returns { used, limit, remaining, plan }
 */
export async function GET(request: NextRequest) {
  const fp = request.nextUrl.searchParams.get('fp')
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'

  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

  // Check if user is Pro via auth header
  let userPlan = 'pro' // All users are Pro now
  let authUserId: string | null = null
  const authHeader = request.headers.get('authorization')
  if (authHeader) {
    try {
      const { createClient } = await import('@supabase/supabase-js')
      const userSupabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { global: { headers: { Authorization: authHeader } } }
      )
      const { data: { user } } = await userSupabase.auth.getUser()
      if (user) {
        authUserId = user.id
        const { data: profile } = await supabase
          .from('profiles')
          .select('plan')
          .eq('id', user.id)
          .single()
        // All users are Pro, but keep the check for future flexibility
        if (profile?.plan) userPlan = 'pro'
      }
    } catch { /* ignore */ }
  }

  // Count usage
  let used = 0
  if (authUserId) {
    const { count } = await supabase
      .from('search_usage')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', authUserId)
      .gte('created_at', monthStart)
    used = count || 0
  } else {
    const identifier = fp ? `fp:${fp}` : ip

    if (fp) {
      const { count } = await supabase
        .from('search_usage')
        .select('*', { count: 'exact', head: true })
        .eq('ip_address', `fp:${fp}`)
        .gte('created_at', monthStart)
      used = count || 0
    }

    if (used === 0) {
      const { count } = await supabase
        .from('search_usage')
        .select('*', { count: 'exact', head: true })
        .eq('ip_address', ip)
        .gte('created_at', monthStart)
      used = count || 0
    }
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

  const baseLimit = PRO_LIMIT
  const totalLimit = baseLimit + bonusSearches

  return NextResponse.json({
    used,
    limit: totalLimit,
    remaining: Math.max(0, totalLimit - used),
    bonus_searches: bonusSearches,
    plan: userPlan,
  })
}
