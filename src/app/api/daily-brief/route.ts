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

interface TrendCandidate {
  title: string
  score: number // normalized engagement score
  source: string
}

async function pickTrendingTopic(): Promise<string | null> {
  // Scan HN, Reddit, and Google Trends in parallel — pick the hottest topic across all
  const [hnCandidates, redditCandidates, googleCandidates] = await Promise.all([
    getHNTrending().catch(() => [] as TrendCandidate[]),
    getRedditTrending().catch(() => [] as TrendCandidate[]),
    getGoogleTrending().catch(() => [] as TrendCandidate[]),
  ])

  const all = [...hnCandidates, ...redditCandidates, ...googleCandidates]

  if (all.length === 0) {
    // Fallback: evergreen topics
    const fallbacks = [
      'AI agents in enterprise 2026',
      'future of remote work',
      'cybersecurity trends 2026',
      'open source AI models',
      'startup funding trends',
    ]
    return fallbacks[Math.floor(Math.random() * fallbacks.length)]
  }

  // Sort by score, pick randomly from top 8 for variety
  all.sort((a, b) => b.score - a.score)
  const top = all.slice(0, 8)
  return top[Math.floor(Math.random() * top.length)].title
}

function cleanTitle(title: string): string {
  let t = title
    .replace(/^(Show HN|Ask HN|Tell HN|Launch HN):\s*/i, '')
    .replace(/\s*\([^)]*\)\s*$/, '')
    .replace(/\[.*?\]\s*/g, '')
    .trim()
  if (t.length > 80) {
    const dash = t.indexOf(' – ')
    const colon = t.indexOf(': ')
    const cut = Math.min(dash > 0 ? dash : 999, colon > 0 ? colon : 999)
    if (cut < 999) t = t.slice(0, cut).trim()
  }
  return t
}

async function getHNTrending(): Promise<TrendCandidate[]> {
  const res = await fetch('https://hn.algolia.com/api/v1/search?tags=front_page&hitsPerPage=30', {
    signal: AbortSignal.timeout(8000),
  })
  if (!res.ok) return []
  const data = await res.json()
  return (data.hits || [])
    .filter((s: any) => s.points > 50 && s.num_comments > 20)
    .map((s: any) => ({
      title: cleanTitle(s.title),
      score: s.points + s.num_comments * 2,
      source: 'hn',
    }))
}

async function getRedditTrending(): Promise<TrendCandidate[]> {
  const subs = ['technology', 'artificial', 'business', 'Futurology']
  const results: TrendCandidate[] = []

  await Promise.all(subs.map(async (sub) => {
    try {
      const res = await fetch(`https://www.reddit.com/r/${sub}/hot.json?limit=10`, {
        headers: { 'User-Agent': 'Pulsed/1.0' },
        signal: AbortSignal.timeout(8000),
      })
      if (!res.ok) return
      const data = await res.json()
      for (const child of data?.data?.children || []) {
        const d = child?.data
        if (!d || d.stickied || d.score < 100) continue
        results.push({
          title: cleanTitle(d.title),
          score: d.score + (d.num_comments || 0) * 2,
          source: 'reddit',
        })
      }
    } catch { /* skip */ }
  }))

  return results
}

async function getGoogleTrending(): Promise<TrendCandidate[]> {
  try {
    const res = await fetch('https://trends.google.com/trending/rss?geo=US', {
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) return []
    const text = await res.text()

    // Parse RSS XML — extract <title> tags inside <item>
    const items: TrendCandidate[] = []
    const itemRegex = /<item>[\s\S]*?<title>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/title>[\s\S]*?<\/item>/g
    let match
    let rank = 20 // top items get higher scores
    while ((match = itemRegex.exec(text)) !== null && items.length < 15) {
      const title = match[1].trim()
      if (title && title.length > 3) {
        items.push({
          title,
          score: rank * 50, // normalize to compete with HN/Reddit scores
          source: 'google',
        })
        rank--
      }
    }
    return items
  } catch {
    return []
  }
}
