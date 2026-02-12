import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

/**
 * POST /api/referrals/redeem
 * Body: { code: string, fingerprint: string }
 * Redeems a referral code — grants +3 bonus searches to BOTH parties.
 */
export async function POST(request: NextRequest) {
  try {
    const { code, fingerprint } = await request.json()
    if (!code || !fingerprint) {
      return NextResponse.json({ error: 'code and fingerprint are required' }, { status: 400 })
    }

    const refereeId = `fp:${fingerprint}`
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'

    // Find the referral code
    const { data: referral } = await supabase
      .from('referrals')
      .select('*')
      .eq('referrer_code', code)
      .limit(1)
      .single()

    if (!referral) {
      return NextResponse.json({ error: 'Invalid referral code' }, { status: 404 })
    }

    // Can't refer yourself
    if (referral.referrer_id === refereeId) {
      return NextResponse.json({ error: 'You cannot use your own referral code' }, { status: 400 })
    }

    // Check if this user already redeemed any code
    const { data: alreadyRedeemed } = await supabase
      .from('referrals')
      .select('id')
      .eq('referee_id', refereeId)
      .eq('bonus_applied', true)
      .limit(1)
      .single()

    if (alreadyRedeemed) {
      return NextResponse.json({ error: 'You have already used a referral code' }, { status: 400 })
    }

    // Create a new referral record for this redemption
    const { error: insertErr } = await supabase.from('referrals').insert({
      referrer_id: referral.referrer_id,
      referrer_code: code,
      referee_id: refereeId,
      referee_ip: ip,
      bonus_applied: true,
    })

    if (insertErr) {
      console.error('Referral redeem insert error:', insertErr)
      return NextResponse.json({ error: 'Failed to redeem referral' }, { status: 500 })
    }

    // Grant +3 bonus searches to referrer
    await upsertBonus(referral.referrer_id, 3)
    // Grant +3 bonus searches to referee
    await upsertBonus(refereeId, 3)

    return NextResponse.json({
      success: true,
      message: 'Referral redeemed! You both get 3 bonus searches.',
    })
  } catch (err) {
    console.error('Referral redeem error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

async function upsertBonus(userId: string, amount: number) {
  // Check if row exists
  const { data: existing } = await supabase
    .from('referral_bonuses')
    .select('bonus_searches')
    .eq('user_id', userId)
    .single()

  if (existing) {
    await supabase
      .from('referral_bonuses')
      .update({ bonus_searches: (existing.bonus_searches || 0) + amount })
      .eq('user_id', userId)
  } else {
    await supabase.from('referral_bonuses').insert({
      user_id: userId,
      bonus_searches: amount,
    })
  }
}
