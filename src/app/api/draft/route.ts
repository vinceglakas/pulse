import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

export const maxDuration = 30

type DraftType = 'linkedin' | 'tweet' | 'email'

const DRAFT_PROMPTS: Record<DraftType, string> = {
  linkedin: `You are a LinkedIn ghostwriter. Write a compelling LinkedIn post based on the research brief below.

Rules:
- Start with a bold hook line that stops the scroll
- Use short paragraphs (1-2 sentences each)
- Include a clear insight or takeaway
- End with a question or CTA to drive engagement
- 150-250 words max
- Professional but conversational tone
- No hashtags (they're cringe on LinkedIn now)
- No emojis
- Write as if the poster did this research themselves — never mention "Pulsed" or any tool`,

  tweet: `You are a Twitter/X ghostwriter. Write a tweet thread (3-5 tweets) based on the research brief below.

Rules:
- Tweet 1: Hook — bold claim or surprising insight that makes people stop scrolling
- Tweet 2-4: Supporting points, each a standalone insight
- Last tweet: Takeaway or prediction
- Each tweet MUST be under 280 characters
- Separate tweets with "---" on its own line
- No hashtags, no emojis
- Sharp, punchy, opinionated
- Write as if the poster did this research themselves — never mention "Pulsed" or any tool`,

  email: `You are a business communications expert. Write a short email snippet based on the research brief below.

Rules:
- Subject line first (prefix with "Subject: ")
- Then blank line, then email body
- 3-4 short paragraphs
- Professional but not stuffy
- Include 1-2 key data points or insights from the brief
- End with a clear next step or CTA
- Total: 100-200 words
- Write as if the sender did this research themselves — never mention "Pulsed" or any tool`,
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { briefText, topic, type } = body as { briefText?: string; topic?: string; type?: string }

    if (!briefText || !topic || !type) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    if (!['linkedin', 'tweet', 'email'].includes(type)) {
      return NextResponse.json({ error: 'Invalid draft type' }, { status: 400 })
    }

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'API key not configured' }, { status: 500 })
    }

    const client = new Anthropic({ apiKey })

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      system: DRAFT_PROMPTS[type as DraftType],
      messages: [{
        role: 'user',
        content: `Topic: "${topic}"\n\nResearch Brief:\n${briefText}`
      }],
    })

    const textBlock = response.content.find(b => b.type === 'text')
    const draft = textBlock?.text || ''

    return NextResponse.json({ draft, type })
  } catch (error) {
    console.error('Draft API error:', error)
    return NextResponse.json({ error: 'Failed to generate draft' }, { status: 500 })
  }
}
