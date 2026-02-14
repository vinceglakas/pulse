import { NextRequest, NextResponse } from 'next/server'
import { getApiUser } from '@/lib/api-auth'

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string; contactId: string }> }) {
  try {
    const auth = await getApiUser(request)
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { contactId } = await params
    const body = await request.json()
    delete body.id
    delete body.user_id
    delete body.account_id

    const { data, error } = await auth.supabase
      .from('account_contacts')
      .update(body)
      .eq('id', contactId)
      .eq('user_id', auth.user.id)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string; contactId: string }> }) {
  try {
    const auth = await getApiUser(request)
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { contactId } = await params

    const { error } = await auth.supabase
      .from('account_contacts')
      .delete()
      .eq('id', contactId)
      .eq('user_id', auth.user.id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
