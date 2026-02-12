import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

// POST: Save a brief
export async function POST(request: NextRequest) {
  try {
    const { briefId, userId } = await request.json()
    if (!briefId || !userId) {
      return NextResponse.json({ error: 'Missing briefId or userId' }, { status: 400 })
    }

    const { error } = await supabase
      .from('saved_briefs')
      .upsert({ brief_id: briefId, user_id: userId }, { onConflict: 'user_id,brief_id' })

    if (error) {
      // Table might not exist, create it
      if (error.code === '42P01') {
        return NextResponse.json({ error: 'Table not ready' }, { status: 500 })
      }
      throw error
    }

    return NextResponse.json({ saved: true })
  } catch (error) {
    console.error('Save brief error:', error)
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 })
  }
}

// DELETE: Unsave a brief
export async function DELETE(request: NextRequest) {
  try {
    const { briefId, userId } = await request.json()
    if (!briefId || !userId) {
      return NextResponse.json({ error: 'Missing briefId or userId' }, { status: 400 })
    }

    await supabase
      .from('saved_briefs')
      .delete()
      .eq('brief_id', briefId)
      .eq('user_id', userId)

    return NextResponse.json({ saved: false })
  } catch (error) {
    console.error('Unsave brief error:', error)
    return NextResponse.json({ error: 'Failed to unsave' }, { status: 500 })
  }
}
