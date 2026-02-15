import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { supabase } from '@/lib/supabase'
import { deepResearch } from '@/lib/deep-research'
import { fetchAndExtract } from '@/lib/scraper'
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

    const { topic, apiKey, persona } = body as { topic?: string; apiKey?: string; persona?: string }

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

    // ── Quota enforcement ──
    const PRO_LIMIT = 999999 // Effectively unlimited for Pro users

    const fp = (body as any).fingerprint as string | undefined
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
    const identifier = fp ? `fp:${fp}` : ip

    // Check if user is Pro via auth header
    let userPlan = 'pro' // All users are Pro now
    let authUserId: string | null = null
    const authHeader = request.headers.get('authorization')
    if (authHeader) {
      try {
        const { createClient } = await import('@supabase/supabase-js')
        const userSupabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          { global: { headers: { Authorization: authHeader } } }
        )
        const { data: { user } } = await userSupabase.auth.getUser()
        if (user) {
          authUserId = user.id
          const { data: profile } = await supabase
            .from('profiles')
            .select('plan')
            .eq('id', user.id)
            .single()
          // All users are Pro, but keep the check for future flexibility
          if (profile?.plan) userPlan = 'pro'
        }
      } catch { /* ignore */ }
    }

    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

    // Count usage — by user_id for logged-in users, by fingerprint/IP for anonymous
    let usedCount = 0
    if (authUserId) {
      const { count } = await supabase
        .from('search_usage')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', authUserId)
        .gte('created_at', monthStart)
      usedCount = count || 0
    } else {
      const { count } = await supabase
        .from('search_usage')
        .select('*', { count: 'exact', head: true })
        .eq('ip_address', identifier)
        .gte('created_at', monthStart)
      usedCount = count || 0
    }

    const baseLimit = PRO_LIMIT

    // Check for referral bonus searches
    let bonusSearches = 0
    try {
      const { data: bonusRow } = await supabase
        .from('referral_bonuses')
        .select('bonus_searches')
        .eq('user_id', identifier)
        .single()
      bonusSearches = bonusRow?.bonus_searches || 0
    } catch { /* no bonus row */ }

    const totalLimit = baseLimit + bonusSearches
    if (usedCount >= totalLimit) {
      const errorMsg = 'You\'ve reached the monthly limit. Please contact support if you need more searches.'
      return NextResponse.json(
        {
          error: errorMsg,
          quota_exceeded: true,
          used: usedCount,
          limit: totalLimit,
        },
        { status: 429 }
      )
    }

    // Run the deep research pipeline
    const result = await deepResearch(trimmedTopic, apiKey, persona)

    // Scrape additional content from top URLs
    const scrapedContent = await scrapeTopUrls(result.sources, apiKey)
    
    // If we have scraped content, enhance the brief
    if (scrapedContent.length > 0) {
      result.brief = await enhanceBriefWithScrapedContent(result.brief, scrapedContent, apiKey, persona)
    }

    if (result.sources.length === 0) {
      return NextResponse.json(
        { error: 'No data found for this topic. Try a different search term.' },
        { status: 404 }
      )
    }

    // Save to Supabase (authUserId already extracted during quota check)
    const userId = authUserId
    const { data: savedBrief, error: dbError } = await supabase
      .from('briefs')
      .insert({
        topic: trimmedTopic,
        brief_text: result.brief,
        sources: result.sources,
        raw_data: { stats: result.stats },
        ...(userId ? { user_id: userId } : {}),
      })
      .select('id, topic, brief_text, sources, created_at')
      .single()

    // Log usage for quota tracking (after brief insert so we have brief_id)
    try {
      await supabase.from('search_usage').insert({
        ip_address: identifier,
        topic: trimmedTopic,
        ...(userId ? { user_id: userId } : {}),
        ...(savedBrief ? { brief_id: savedBrief.id } : {}),
      })
    } catch { /* non-blocking */ }

    if (dbError) {
      console.error('Supabase insert error:', dbError)
      return NextResponse.json({
        id: null,
        topic: trimmedTopic,
        brief: result.brief,
        sources: result.sources,
        stats: result.stats,
        persona: (persona as ResearchResponse['persona']) || undefined,
        created_at: new Date().toISOString(),
      } satisfies ResearchResponse)
    }

    const response: ResearchResponse = {
      id: savedBrief.id as string,
      topic: savedBrief.topic as string,
      brief: savedBrief.brief_text as string,
      sources: savedBrief.sources as ResearchResponse['sources'],
      persona: (persona as ResearchResponse['persona']) || undefined,
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

/**
 * Scrape content from top URLs in research results
 */
async function scrapeTopUrls(sources: any[], apiKey?: string): Promise<any[]> {
  // Filter for URLs that are worth scraping (exclude Reddit, HN, etc.)
  const scrapableUrls = sources
    .filter(source => {
      const url = source.url?.toLowerCase() || ''
      // Skip social platforms and aggregators
      return !url.includes('reddit.com') && 
             !url.includes('news.ycombinator.com') && 
             !url.includes('youtube.com') &&
             !url.includes('twitter.com') &&
             !url.includes('x.com') &&
             !url.includes('instagram.com') &&
             !url.includes('facebook.com') &&
             !url.includes('linkedin.com') &&
             // Only scrape HTTP(S) URLs
             (url.startsWith('http://') || url.startsWith('https://'))
    })
    .slice(0, 5) // Top 5 most relevant URLs
    .map(source => source.url)
  
  if (scrapableUrls.length === 0) {
    return []
  }
  
  try {
    // Scrape URLs in parallel
    const scrapeResults = await Promise.allSettled(
      scrapableUrls.map(async (url) => {
        try {
          const content = await fetchAndExtract(url)
          return {
            url,
            title: content.title,
            description: content.description,
            text: content.text.slice(0, 3000), // Limit text to 3000 chars
            author: content.author,
            publishedDate: content.publishedDate
          }
        } catch (error) {
          console.error(`Failed to scrape ${url}:`, error)
          return null
        }
      })
    )
    
    return scrapeResults
      .filter(result => result.status === 'fulfilled' && result.value !== null)
      .map(result => (result as PromiseFulfilledResult<any>).value)
  } catch (error) {
    console.error('Error scraping URLs:', error)
    return []
  }
}

/**
 * Enhance research brief with scraped content
 */
async function enhanceBriefWithScrapedContent(
  originalBrief: string, 
  scrapedContent: any[], 
  apiKey?: string,
  persona?: string
): Promise<string> {
  const anthropicKey = apiKey || process.env.ANTHROPIC_API_KEY
  if (!anthropicKey) {
    return originalBrief
  }
  
  try {
    const client = new Anthropic({ apiKey: anthropicKey })
    
    // Format scraped content
    const scrapedText = scrapedContent.map(content => 
      `URL: ${content.url}\nTitle: ${content.title}\n${content.author ? `Author: ${content.author}\n` : ''}${content.publishedDate ? `Date: ${content.publishedDate}\n` : ''}Content: ${content.text.slice(0, 1000)}${content.text.length > 1000 ? '...' : ''}`
    ).join('\n\n---\n\n')
    
    const systemPrompt = `You are Pulsed, an expert research analyst. Your task is to enhance an existing research brief with additional insights from scraped web content.

Rules:
- Integrate the new information naturally into the existing brief
- Don't mention that content was "scraped" or from "web pages"
- Maintain the same tone and structure as the original brief
- Add new insights, data points, or perspectives that weren't in the original
- Keep the enhanced brief concise and focused
- Preserve any existing JSON structure if present

The enhanced brief should feel like a natural evolution of the original, not a complete rewrite.`

    const userPrompt = `Original Research Brief:
${originalBrief}

Additional Insights from Web Content:
${scrapedText}

Please enhance the original brief by integrating these additional insights naturally. Focus on adding value with new information, data points, or perspectives that complement the existing analysis.`

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }]
    })
    
    const textBlock = response.content.find(b => b.type === 'text')
    const enhancedBrief = textBlock?.text?.trim()
    
    return enhancedBrief || originalBrief
  } catch (error) {
    console.error('Error enhancing brief with scraped content:', error)
    return originalBrief
  }
}
