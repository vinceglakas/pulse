import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Check if a brief is saved by the current user
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ saved: false })
    }

    const token = authHeader.replace('Bearer ', '')
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { global: { headers: { Authorization: `Bearer ${token}` } } }
    )

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ saved: false })

    const briefId = request.nextUrl.searchParams.get('briefId')
    if (!briefId) return NextResponse.json({ saved: false })

    const { data } = await supabase
      .from('saved_briefs')
      .select('id')
      .eq('user_id', user.id)
      .eq('brief_id', briefId)
      .maybeSingle()

    return NextResponse.json({ saved: !!data })
  } catch {
    return NextResponse.json({ saved: false })
  }
}
