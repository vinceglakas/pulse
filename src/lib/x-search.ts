/**
 * X/Twitter Search via xAI API
 * Uses the x_search tool through the OpenAI-compatible Responses API
 * 
 * Requires XAI_API_KEY environment variable
 */

import type { SourcePost } from './types'

interface XSearchOptions {
  topic: string
  fromDate?: string  // ISO8601 YYYY-MM-DD
  toDate?: string
  allowedHandles?: string[]
  excludedHandles?: string[]
}

interface XAIResponse {
  id: string
  output: Array<{
    type: string
    content?: Array<{
      type: string
      text?: string
    }>
  }>
  citations?: Array<{
    url: string
    title?: string
  }>
}

export async function searchX(topic: string): Promise<SourcePost[]> {
  const apiKey = process.env.XAI_API_KEY
  if (!apiKey) return []

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  const fromDate = thirtyDaysAgo.toISOString().split('T')[0]
  const toDate = new Date().toISOString().split('T')[0]

  try {
    const posts = await xSearchQuery({
      topic,
      fromDate,
      toDate,
    }, apiKey)

    return posts
  } catch (error) {
    console.error('X search error:', error)
    return []
  }
}

async function xSearchQuery(
  options: XSearchOptions,
  apiKey: string,
): Promise<SourcePost[]> {
  const { topic, fromDate, toDate } = options

  // Use the OpenAI-compatible Responses API with x_search tool
  const response = await fetch('https://api.x.ai/v1/responses', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'grok-4',
      tools: [
        {
          type: 'x_search',
          x_search: {
            ...(fromDate && { from_date: fromDate }),
            ...(toDate && { to_date: toDate }),
          },
        },
      ],
      input: `Search X/Twitter for discussions about "${topic}" from the last 30 days. Find the most engaged-with posts (highest likes, reposts, replies). For each post, extract: the author's handle, the post text, engagement metrics (likes, reposts, replies), and the post URL. Return up to 25 of the most relevant and engaged posts. Focus on substantive discussions, not spam or promotional content.`,
    }),
    signal: AbortSignal.timeout(120000),
  })

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unknown error')
    console.error(`xAI API error (${response.status}):`, errorText)
    return []
  }

  const data: XAIResponse = await response.json()

  // Extract the text response from Grok
  const posts: SourcePost[] = []

  for (const output of data.output || []) {
    if (output.type === 'message' && output.content) {
      for (const content of output.content) {
        if (content.type === 'text' && content.text) {
          // Parse Grok's response to extract individual posts
          const parsed = parseXPostsFromGrok(content.text, data.citations)
          posts.push(...parsed)
        }
      }
    }
  }

  return posts
}

/**
 * Parse Grok's text response into structured SourcePost objects
 * Grok typically returns posts in a structured format with citations
 */
function parseXPostsFromGrok(
  text: string,
  citations?: Array<{ url: string; title?: string }>,
): SourcePost[] {
  const posts: SourcePost[] = []

  // Try to extract post data from the text
  // Grok usually formats posts with @handles, text, and metrics
  const postBlocks = text.split(/\n{2,}/).filter(block => block.trim().length > 20)

  for (const block of postBlocks) {
    // Try to find @handle
    const handleMatch = block.match(/@(\w{1,15})/)
    const handle = handleMatch ? handleMatch[1] : ''

    // Try to find engagement numbers
    const likesMatch = block.match(/(\d[\d,]*)\s*(?:likes?|❤️|♥)/i)
    const repostsMatch = block.match(/(\d[\d,]*)\s*(?:reposts?|retweets?|🔁)/i)
    const repliesMatch = block.match(/(\d[\d,]*)\s*(?:replies|comments?|💬)/i)

    const likes = likesMatch ? parseInt(likesMatch[1].replace(/,/g, '')) : 0
    const reposts = repostsMatch ? parseInt(repostsMatch[1].replace(/,/g, '')) : 0
    const replies = repliesMatch ? parseInt(repliesMatch[1].replace(/,/g, '')) : 0

    // Clean the text (remove metrics, keep substance)
    let cleanText = block
      .replace(/@\w+/g, '')
      .replace(/\d[\d,]*\s*(?:likes?|reposts?|retweets?|replies|comments?|❤️|♥|🔁|💬)/gi, '')
      .replace(/https?:\/\/\S+/g, '')
      .trim()
      .slice(0, 280)

    if (cleanText.length < 10) continue

    // Try to find a matching citation URL
    let postUrl = ''
    if (citations) {
      const citationMatch = citations.find(c =>
        c.url.includes('x.com') || c.url.includes('twitter.com')
      )
      if (citationMatch) {
        postUrl = citationMatch.url
      }
    }

    if (!postUrl && handle) {
      postUrl = `https://x.com/${handle}`
    }

    posts.push({
      title: handle ? `@${handle}: ${cleanText.slice(0, 120)}` : cleanText.slice(0, 120),
      url: postUrl,
      source: 'x' as SourcePost['source'],
      score: likes + reposts,
      comments: replies,
      created_at: new Date().toISOString(), // xAI doesn't always return exact dates
      body: cleanText,
    })
  }

  // Also extract from citations directly if we didn't get many posts from text parsing
  if (posts.length < 5 && citations) {
    for (const citation of citations) {
      if (citation.url.includes('x.com') || citation.url.includes('twitter.com')) {
        const alreadyHave = posts.some(p => p.url === citation.url)
        if (!alreadyHave) {
          posts.push({
            title: citation.title || citation.url,
            url: citation.url,
            source: 'x' as SourcePost['source'],
            score: 0,
            comments: 0,
            created_at: new Date().toISOString(),
          })
        }
      }
    }
  }

  return posts
}

/**
 * Phase 2: Search for specific handles discovered in Phase 1
 */
export async function searchXHandles(
  topic: string,
  handles: string[],
): Promise<SourcePost[]> {
  const apiKey = process.env.XAI_API_KEY
  if (!apiKey || handles.length === 0) return []

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  const fromDate = thirtyDaysAgo.toISOString().split('T')[0]
  const toDate = new Date().toISOString().split('T')[0]

  try {
    const response = await fetch('https://api.x.ai/v1/responses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'grok-4',
        tools: [
          {
            type: 'x_search',
            x_search: {
              allowed_x_handles: handles.slice(0, 10),
              from_date: fromDate,
              to_date: toDate,
            },
          },
        ],
        input: `Find posts from these X accounts about "${topic}" from the last 30 days: ${handles.map(h => `@${h}`).join(', ')}. Return the most engaged-with posts with full text, engagement metrics, and URLs.`,
      }),
      signal: AbortSignal.timeout(120000),
    })

    if (!response.ok) return []

    const data: XAIResponse = await response.json()
    const posts: SourcePost[] = []

    for (const output of data.output || []) {
      if (output.type === 'message' && output.content) {
        for (const content of output.content) {
          if (content.type === 'text' && content.text) {
            posts.push(...parseXPostsFromGrok(content.text, data.citations))
          }
        }
      }
    }

    return posts
  } catch {
    return []
  }
}
