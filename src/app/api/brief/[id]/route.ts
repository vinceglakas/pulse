import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import type { Brief, ResearchResponse, SourcePost } from '@/lib/types'

// UUID v4 regex for validation
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    if (!id || !UUID_REGEX.test(id)) {
      return NextResponse.json(
        { error: 'Invalid brief ID. Must be a valid UUID.' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('briefs')
      .select('id, topic, brief_text, sources, created_at')
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Brief not found' },
          { status: 404 }
        )
      }
      console.error('Supabase query error:', error)
      return NextResponse.json(
        { error: 'Database error' },
        { status: 500 }
      )
    }

    const brief = data as Pick<Brief, 'id' | 'topic' | 'brief_text' | 'sources' | 'created_at'>

    const response: ResearchResponse = {
      id: brief.id,
      topic: brief.topic,
      brief: brief.brief_text,
      sources: brief.sources as SourcePost[],
      created_at: brief.created_at,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Brief fetch error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
