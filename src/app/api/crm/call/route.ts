import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getUserFromRequest } from '@/lib/server-auth'

// Initiate a call via Twilio or log it
export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { phone, contact_id, notes } = await req.json()

  // Get user's Twilio settings
  const { data: profile } = await supabase.from('profiles').select('twilio_sid, twilio_token, twilio_from, phone').eq('id', user.id).single() as any

  let callStarted = false

  if (profile?.twilio_sid && profile?.twilio_token && profile?.twilio_from) {
    try {
      const auth = Buffer.from(`${profile.twilio_sid}:${profile.twilio_token}`).toString('base64')
      const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${profile.twilio_sid}/Calls.json`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Basic ${auth}`,
        },
        body: new URLSearchParams({
          To: phone,
          From: profile.twilio_from,
          Url: 'http://demo.twilio.com/docs/voice.xml', // TwiML for basic call
        }),
      })
      callStarted = res.ok
    } catch {}
  }

  // Log the call as an activity
  if (contact_id) {
    await supabase.from('activities').insert({
      user_id: user.id,
      contact_id,
      type: 'call',
      subject: `Call to ${phone}`,
      body: notes || (callStarted ? 'Call initiated via Twilio' : 'Call logged — configure Twilio in settings to enable click-to-call'),
      completed_at: new Date().toISOString(),
    })

    await supabase.from('contacts').update({ last_contacted: new Date().toISOString() }).eq('id', contact_id).eq('user_id', user.id)
  }

  // If no Twilio, return a tel: link for the browser to handle
  return NextResponse.json({
    callStarted,
    telLink: `tel:${phone}`,
    message: callStarted ? 'Call initiated' : 'No Twilio configured — use the tel: link or add Twilio credentials in settings',
  })
}
