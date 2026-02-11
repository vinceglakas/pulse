import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { supabase } from '@/lib/supabase'
import { deepResearch } from '@/lib/deep-research'
import type { ResearchResponse } from '@/lib/types'

export const maxDuration = 120 // 2 min — fast APIs return in <2s, Grok adds AI-powered results if it finishes in time

export async function POST(request: NextRequest) {
  try {
    const body: unknown = await request.json()

    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      )
    }

    const { topic, apiKey } = body as { topic?: string; apiKey?: string }

    if (!topic || typeof topic !== 'string') {
      return NextResponse.json(
        { error: 'Topic is required and must be a string' },
        { status: 400 }
      )
    }

    const trimmedTopic = topic.trim()

    if (trimmedTopic.length === 0) {
      return NextResponse.json(
        { error: 'Topic cannot be empty' },
        { status: 400 }
      )
    }

    if (trimmedTopic.length > 200) {
      return NextResponse.json(
        { error: 'Topic must be 200 characters or less' },
        { status: 400 }
      )
    }

    // Run the deep research pipeline
    const result = await deepResearch(trimmedTopic, apiKey)

    if (result.sources.length === 0) {
      return NextResponse.json(
        { error: 'No data found for this topic. Try a different search term.' },
        { status: 404 }
      )
    }

    // Save to Supabase
    const { data: savedBrief, error: dbError } = await supabase
      .from('briefs')
      .insert({
        topic: trimmedTopic,
        brief_text: result.brief,
        sources: result.sources,
        raw_data: { stats: result.stats },
      })
      .select('id, topic, brief_text, sources, created_at')
      .single()

    if (dbError) {
      console.error('Supabase insert error:', dbError)
      return NextResponse.json({
        id: null,
        topic: trimmedTopic,
        brief: result.brief,
        sources: result.sources,
        stats: result.stats,
        created_at: new Date().toISOString(),
      } satisfies ResearchResponse)
    }

    const response: ResearchResponse = {
      id: savedBrief.id as string,
      topic: savedBrief.topic as string,
      brief: savedBrief.brief_text as string,
      sources: savedBrief.sources as ResearchResponse['sources'],
      created_at: savedBrief.created_at as string,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Research API error:', error)

    if (error instanceof Anthropic.APIError) {
      return NextResponse.json(
        { error: `Claude API error: ${error.message}` },
        { status: error.status || 500 }
      )
    }

    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
