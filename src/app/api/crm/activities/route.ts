import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getUserFromRequest } from '@/lib/server-auth'

export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const contact_id = req.nextUrl.searchParams.get('contact_id')
  const deal_id = req.nextUrl.searchParams.get('deal_id')
  let query = supabase.from('activities').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(50)
  if (contact_id) query = query.eq('contact_id', contact_id)
  if (deal_id) query = query.eq('deal_id', deal_id)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ activities: data })
}

export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { data, error } = await supabase.from('activities').insert({ ...body, user_id: user.id }).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (body.contact_id) {
    await supabase.from('contacts').update({ last_contacted: new Date().toISOString() }).eq('id', body.contact_id).eq('user_id', user.id)
  }

  return NextResponse.json({ activity: data })
}
