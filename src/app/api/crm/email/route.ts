import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getUserFromRequest } from '@/lib/server-auth'

// Send email via user's configured SMTP or Resend
export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { to, subject, body, contact_id, template_id } = await req.json()

  let emailBody = body
  let emailSubject = subject

  // If using a template, fetch it
  if (template_id) {
    const { data: template } = await supabase.from('email_templates').select('*').eq('id', template_id).eq('user_id', user.id).single()
    if (template) {
      emailSubject = template.subject || subject
      emailBody = template.body || body
    }
  }

  // Get user's email settings
  const { data: profile } = await supabase.from('profiles').select('email, smtp_host, smtp_port, smtp_user, smtp_pass, resend_key').eq('id', user.id).single() as any

  let sent = false
  let method = 'none'

  // Try Resend first
  if (profile?.resend_key) {
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${profile.resend_key}` },
        body: JSON.stringify({
          from: profile.email || 'noreply@pulsed.ai',
          to: [to],
          subject: emailSubject,
          html: emailBody.replace(/\n/g, '<br>'),
        }),
      })
      sent = res.ok
      method = 'resend'
    } catch {}
  }

  // Fallback: Log the email as an activity even if not sent
  if (contact_id) {
    await supabase.from('activities').insert({
      user_id: user.id,
      contact_id,
      type: 'email',
      subject: emailSubject,
      body: `To: ${to}\n\n${emailBody}${sent ? '' : '\n\n⚠️ Email not sent — configure Resend API key in settings'}`,
      completed_at: sent ? new Date().toISOString() : null,
    })

    await supabase.from('contacts').update({ last_contacted: new Date().toISOString() }).eq('id', contact_id).eq('user_id', user.id)
  }

  return NextResponse.json({ sent, method, message: sent ? 'Email sent' : 'Email logged but not sent — add Resend API key in settings' })
}

// Get email templates
export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase.from('email_templates').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ templates: data })
}
