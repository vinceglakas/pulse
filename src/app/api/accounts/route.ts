import { NextRequest, NextResponse } from 'next/server'
import { getApiUser } from '@/lib/api-auth'

export async function GET(request: NextRequest) {
  try {
    const auth = await getApiUser(request)
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const status = request.nextUrl.searchParams.get('status')
    const search = request.nextUrl.searchParams.get('search')

    let query = auth.supabase
      .from('accounts')
      .select('*, account_activities(created_at, summary, follow_up_date)')
      .eq('user_id', auth.user.id)
      .order('updated_at', { ascending: false })

    if (status && status !== 'all') {
      if (status === 'closed') {
        query = query.in('status', ['closed-won', 'closed-lost'])
      } else {
        query = query.eq('status', status)
      }
    }

    if (search) {
      query = query.ilike('name', `%${search}%`)
    }

    const { data, error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getApiUser(request)
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const { data, error } = await auth.supabase
      .from('accounts')
      .insert({ ...body, user_id: auth.user.id })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
