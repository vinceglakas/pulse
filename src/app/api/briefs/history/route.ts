import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

// GET /api/briefs/history?fp=<fingerprint>
export async function GET(request: NextRequest) {
  const fp = request.nextUrl.searchParams.get('fp')
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  const identifier = fp ? `fp:${fp}` : ip

  try {
    // Get recent searches by this user (via fingerprint/IP)
    const { data: searches } = await supabase
      .from('search_usage')
      .select('id, topic, brief_id, created_at')
      .eq('ip_address', identifier)
      .order('created_at', { ascending: false })
      .limit(20)

    // Get the briefs for these searches
    const briefIds = (searches || []).map(s => s.brief_id).filter(Boolean)
    let briefs: any[] = []

    if (briefIds.length > 0) {
      const { data } = await supabase
        .from('briefs')
        .select('id, topic, created_at')
        .in('id', briefIds)

      briefs = data || []
    }

    return NextResponse.json({
      searches: searches || [],
      briefs,
    })
  } catch (error) {
    console.error('History error:', error)
    return NextResponse.json({ error: 'Failed to load history' }, { status: 500 })
  }
}
