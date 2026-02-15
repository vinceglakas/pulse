import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { supabase } from '@/lib/supabase'

export const maxDuration = 30

type DraftType = 'linkedin' | 'tweet' | 'email' | 'twitter_thread' | 'linkedin_post' | 'newsletter' | 'blog_outline'

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

  twitter_thread: `You are a Twitter/X ghostwriter. Write an engaging Twitter thread based on the research brief below.

Rules:
- 5-8 tweets total
- Tweet 1: Hook — bold claim, surprising stat, or provocative question that stops the scroll
- Tweet 2-3: Context and background
- Tweet 4-6: Key insights and data points from the research
- Tweet 7-8: Takeaway, prediction, or call to action
- Each tweet MUST be under 280 characters
- Use line breaks for readability
- No hashtags, no emojis
- Sharp, punchy, opinionated tone
- Write as if the poster did this research themselves — never mention "Pulsed" or any tool
- Separate tweets with "---" on its own line`,

  linkedin_post: `You are a LinkedIn ghostwriter. Write a viral LinkedIn post based on the research brief below.

Rules:
- Hook: Start with a bold statement, surprising insight, or relatable pain point
- Storytelling: Use narrative structure with setup, tension, and resolution
- Value: Include 2-3 actionable insights or key data points
- Format: Short paragraphs (1-2 sentences), plenty of white space
- Tone: Professional but conversational, authentic voice
- CTA: End with a thought-provoking question or clear call to action
- Length: 200-300 words
- No hashtags, no emojis
- Write as if the poster did this research themselves — never mention "Pulsed" or any tool`,

  newsletter: `You are an email marketing expert. Write a newsletter based on the research brief below.

Rules:
- Subject line: Create curiosity, urgency, or clear benefit (prefix with "Subject: ")
- Opening: Hook the reader in first 2 sentences
- Body: Scannable format with short paragraphs, bullet points
- Content: 3-5 key insights from the research
- Tone: Informative but engaging, like a smart friend sharing insights
- CTA: Clear next step or action item
- Length: 150-250 words
- Format: Subject line, blank line, then email body
- Write as if the sender did this research themselves — never mention "Pulsed" or any tool`,

  blog_outline: `You are a content strategist. Create a detailed blog post outline based on the research brief below.

Rules:
- H1: Compelling title that includes the main topic
- H2s: 4-6 main sections covering key themes
- For each H2: Include 2-3 bullet points with key points/data
- Introduction: Hook, problem statement, what reader will learn
- Conclusion: Key takeaways and call to action
- SEO: Suggest 2-3 keywords to target
- Format: Clear hierarchy with H1, H2s, and bullet points
- Focus on actionable insights from the research
- Write as if the blogger did this research themselves — never mention "Pulsed" or any tool`,
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { brief_id, topic, type } = body as { brief_id?: string; topic?: string; type?: string }

    if (!brief_id || !topic || !type) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    if (!['linkedin', 'tweet', 'email', 'twitter_thread', 'linkedin_post', 'newsletter', 'blog_outline'].includes(type)) {
      return NextResponse.json({ error: 'Invalid draft type' }, { status: 400 })
    }

    // Fetch the brief from the database
    const { data: briefData, error: briefError } = await supabase
      .from('briefs')
      .select('brief_text')
      .eq('id', brief_id)
      .single()

    if (briefError || !briefData) {
      return NextResponse.json({ error: 'Brief not found' }, { status: 404 })
    }

    const briefText = briefData.brief_text as string

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
