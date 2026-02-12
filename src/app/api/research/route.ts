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
    const FREE_LIMIT = 3
    const PRO_LIMIT = 50

    const fp = (body as any).fingerprint as string | undefined
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
    const identifier = fp ? `fp:${fp}` : ip

    // Check if user is Pro via auth header
    let userPlan = 'free'
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
          if (profile?.plan === 'pro') userPlan = 'pro'
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

    const baseLimit = userPlan === 'pro' ? PRO_LIMIT : FREE_LIMIT

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
      const errorMsg = userPlan === 'pro'
        ? 'You\'ve used all 50 Pro searches this month. They reset on the 1st.'
        : 'You\'ve used all 3 free searches this month. Upgrade to Pro for 50 searches/month.'
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
