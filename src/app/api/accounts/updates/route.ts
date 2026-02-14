import { NextRequest, NextResponse } from 'next/server'
import { getApiUser } from '@/lib/api-auth'

export async function GET(request: NextRequest) {
  try {
    const auth = await getApiUser(request)
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const accountId = request.nextUrl.searchParams.get('account_id')
    const unreadOnly = request.nextUrl.searchParams.get('unread') !== 'false'

    let query = auth.supabase
      .from('account_updates')
      .select('*, accounts(id, name)')
      .eq('user_id', auth.user.id)
      .order('created_at', { ascending: false })
      .limit(50)

    if (accountId) query = query.eq('account_id', accountId)
    if (unreadOnly) query = query.eq('is_read', false)

    const { data, error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

// Mark updates as read
export async function PUT(request: NextRequest) {
  try {
    const auth = await getApiUser(request)
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { ids } = await request.json() as { ids: string[] }
    if (!ids?.length) return NextResponse.json({ error: 'ids required' }, { status: 400 })

    const { error } = await auth.supabase
      .from('account_updates')
      .update({ is_read: true })
      .in('id', ids)
      .eq('user_id', auth.user.id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
