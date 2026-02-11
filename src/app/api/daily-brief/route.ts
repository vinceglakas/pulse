import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { deepResearch } from '@/lib/deep-research'

export const maxDuration = 120

// GET: Fetch today's daily brief (or most recent)
export async function GET() {
  try {
    // Find most recent daily brief using JSONB contains
    const { data, error } = await supabase
      .from('briefs')
      .select('id, topic, brief_text, sources, created_at, raw_data')
      .contains('raw_data', { is_daily: true })
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (error || !data) {
      // Fallback: try filter syntax in case contains doesn't work
      const { data: fallbackData, error: fallbackError } = await supabase
        .from('briefs')
        .select('id, topic, brief_text, sources, created_at, raw_data')
        .filter('raw_data->>is_daily', 'eq', 'true')
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (fallbackError || !fallbackData) {
        return NextResponse.json({ error: 'No daily brief available' }, { status: 404 })
      }

      return NextResponse.json({
        id: fallbackData.id,
        topic: fallbackData.topic,
        brief: fallbackData.brief_text,
        sources: fallbackData.sources,
        created_at: fallbackData.created_at,
        daily_date: fallbackData.raw_data?.daily_date || null,
      })
    }

    return NextResponse.json({
      id: data.id,
      topic: data.topic,
      brief: data.brief_text,
      sources: data.sources,
      created_at: data.created_at,
      daily_date: data.raw_data?.daily_date || null,
    })
  } catch (error) {
    console.error('Daily brief GET error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

// POST: Generate a new daily brief (called by cron)
export async function POST(request: NextRequest) {
  try {
    // Simple auth: check for a secret header
    const authHeader = request.headers.get('x-cron-secret')
    const cronSecret = process.env.CRON_SECRET || 'pulsed-daily-2026'
    if (authHeader !== cronSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Step 1: Pick a trending topic from HN front page
    const topic = await pickTrendingTopic()
    if (!topic) {
      return NextResponse.json({ error: 'Could not find trending topic' }, { status: 500 })
    }

    // Step 2: Run deep research with "analyst" persona for comprehensive brief
    const result = await deepResearch(topic, undefined, 'analyst')

    if (result.sources.length === 0) {
      return NextResponse.json({ error: 'No sources found for topic' }, { status: 500 })
    }

    // Step 3: Save to Supabase with daily flag
    const today = new Date().toISOString().split('T')[0]
    const { data: savedBrief, error: dbError } = await supabase
      .from('briefs')
      .insert({
        topic,
        brief_text: result.brief,
        sources: result.sources,
        raw_data: {
          stats: result.stats,
          is_daily: true,
          daily_date: today,
        },
      })
      .select('id, topic, created_at')
      .single()

    if (dbError) {
      console.error('Supabase error:', dbError)
      return NextResponse.json({ error: 'Failed to save daily brief' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      id: savedBrief.id,
      topic,
      date: today,
    })
  } catch (error) {
    console.error('Daily brief POST error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

async function pickTrendingTopic(): Promise<string | null> {
  try {
    // Fetch HN front page stories
    const res = await fetch('https://hn.algolia.com/api/v1/search?tags=front_page&hitsPerPage=30', {
      signal: AbortSignal.timeout(10000),
    })
    if (!res.ok) return null
    const data = await res.json()
    const stories = data.hits || []

    // Filter for tech/AI/business topics with good engagement
    const candidates = stories
      .filter((s: any) => s.points > 50 && s.num_comments > 20)
      .sort((a: any, b: any) => (b.points + b.num_comments * 2) - (a.points + a.num_comments * 2))

    if (candidates.length === 0) return null

    // Pick a random one from top 10 to add variety
    const top = candidates.slice(0, 10)
    const pick = top[Math.floor(Math.random() * top.length)]

    // Extract a clean search topic from the title
    let topic = pick.title
      .replace(/^(Show HN|Ask HN|Tell HN|Launch HN):\s*/i, '')
      .replace(/\s*\([^)]*\)\s*$/, '') // Remove trailing parenthetical
      .trim()

    // If title is too long, truncate to first meaningful phrase
    if (topic.length > 80) {
      const dash = topic.indexOf(' \u2013 ')
      const colon = topic.indexOf(': ')
      const cut = Math.min(
        dash > 0 ? dash : 999,
        colon > 0 ? colon : 999
      )
      if (cut < 999) topic = topic.slice(0, cut).trim()
    }

    return topic
  } catch {
    return null
  }
}
