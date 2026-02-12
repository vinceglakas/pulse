import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
  let code = ''
  for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)]
  return code
}

/**
 * POST /api/referrals/generate
 * Body: { fingerprint: string }
 * Returns existing or new referral code for this user.
 */
export async function POST(request: NextRequest) {
  try {
    const { fingerprint } = await request.json()
    if (!fingerprint) {
      return NextResponse.json({ error: 'fingerprint is required' }, { status: 400 })
    }

    const referrerId = `fp:${fingerprint}`

    // Check if user already has a referral code
    const { data: existing } = await supabase
      .from('referrals')
      .select('referrer_code')
      .eq('referrer_id', referrerId)
      .is('referee_id', null)
      .limit(1)
      .single()

    if (existing?.referrer_code) {
      // Return the existing code (the "template" row)
      // Actually, let's find any row with this referrer to get their code
    }

    // Find any referral code for this referrer
    const { data: anyRow } = await supabase
      .from('referrals')
      .select('referrer_code')
      .eq('referrer_id', referrerId)
      .limit(1)
      .single()

    if (anyRow?.referrer_code) {
      return NextResponse.json({ code: anyRow.referrer_code })
    }

    // Generate a new unique code
    let code = generateCode()
    let attempts = 0
    while (attempts < 5) {
      const { data: conflict } = await supabase
        .from('referrals')
        .select('id')
        .eq('referrer_code', code)
        .limit(1)
        .single()

      if (!conflict) break
      code = generateCode()
      attempts++
    }

    // Insert a "template" referral row (no referee yet)
    const { error: insertErr } = await supabase.from('referrals').insert({
      referrer_id: referrerId,
      referrer_code: code,
      referee_id: null,
      referee_ip: null,
      bonus_applied: false,
    })

    if (insertErr) {
      console.error('Referral insert error:', insertErr)
      return NextResponse.json({ error: 'Failed to generate referral code' }, { status: 500 })
    }

    return NextResponse.json({ code })
  } catch (err) {
    console.error('Referral generate error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
