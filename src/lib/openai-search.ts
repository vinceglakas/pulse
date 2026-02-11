/**
 * Web Search via OpenAI Responses API with web_search tool
 * Same approach as mvanhorn/last30days-skill — the gold standard.
 * 
 * Uses OpenAI's built-in web search to discover Reddit threads, web articles,
 * and general content. Superior to direct Reddit search (Reddit's search is trash)
 * and superior to DDG scraping.
 */

import type { SourcePost } from './types'

const OPENAI_RESPONSES_URL = 'https://api.openai.com/v1/responses'
const MODEL = 'gpt-4.1-mini'

interface OpenAIWebSearchResult {
  id: string
  output: Array<{
    type: string
    content?: Array<{
      type: string
      text?: string
      annotations?: Array<{
        type: string
        url?: string
        title?: string
      }>
    }>
  }>
}

/**
 * Search Reddit via OpenAI's web_search tool
 * Finds threads that Reddit's own search misses
 */
export async function searchRedditViaOpenAI(
  topic: string,
): Promise<SourcePost[]> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) return []

  const prompt = `Find Reddit discussion threads about: ${topic}

Search for the core subject on Reddit using multiple searches:
1. "${topic} site:reddit.com"
2. "reddit ${topic} discussion"

For each thread found, provide:
- The exact Reddit URL (must contain /r/ and /comments/)
- The thread title
- The subreddit name
- Approximate score/upvotes if visible

Find 15-25 threads from the last 30 days. Return MORE rather than fewer.`

  return await executeWebSearch(apiKey, prompt, 'reddit')
}

/**
 * Search the general web via OpenAI's web_search tool
 */
export async function searchWebViaOpenAI(
  topic: string,
  queryType: string,
): Promise<SourcePost[]> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) return []

  const prompt = `Find 10-15 recent high-quality articles about "${topic}" (${queryType} focus, last 30 days).

Skip Reddit and Hacker News results.
Prioritize: Industry blogs, news outlets, company announcements, expert analyses.

For each result provide the URL, title, and a 1-2 sentence summary.`

  return await executeWebSearch(apiKey, prompt, 'web')
}

/**
 * Core web search execution via OpenAI Responses API
 */
async function executeWebSearch(
  apiKey: string,
  prompt: string,
  sourceType: 'reddit' | 'web',
): Promise<SourcePost[]> {
  try {
    const response = await fetch(OPENAI_RESPONSES_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: MODEL,
        tools: [{ type: 'web_search' }],
        input: prompt,
      }),
      signal: AbortSignal.timeout(60000),
    })

    if (!response.ok) {
      const errorText = await response.text().catch(() => '')
      console.error(`[SEARCH] OpenAI error (${response.status}):`, errorText.slice(0, 200))
      return []
    }

    const data: OpenAIWebSearchResult = await response.json()
    return parseResults(data, sourceType)
  } catch (error) {
    console.error(`[SEARCH] Error:`, error instanceof Error ? error.message : error)
    return []
  }
}

/**
 * Parse OpenAI Responses API results into SourcePost objects
 */
function parseResults(data: OpenAIWebSearchResult, sourceType: 'reddit' | 'web'): SourcePost[] {
  const posts: SourcePost[] = []
  const seenUrls = new Set<string>()

  for (const output of data.output || []) {
    if (output.type !== 'message' || !output.content) continue

    for (const content of output.content) {
      // Extract from URL citation annotations (structured, reliable)
      if (content.annotations) {
        for (const ann of content.annotations) {
          if (ann.type !== 'url_citation' || !ann.url) continue
          const norm = ann.url.replace(/\/$/, '').toLowerCase()
          if (seenUrls.has(norm)) continue

          if (sourceType === 'reddit') {
            if (!ann.url.includes('reddit.com/r/') || !ann.url.includes('/comments/')) continue
          } else {
            if (ann.url.includes('reddit.com') || ann.url.includes('news.ycombinator.com')) continue
          }

          seenUrls.add(norm)
          const post: SourcePost = {
            title: ann.title || ann.url,
            url: ann.url,
            source: sourceType === 'reddit' ? 'reddit' : 'web',
            score: 0,
            comments: 0,
            created_at: new Date().toISOString(),
          }

          if (sourceType === 'reddit') {
            const subMatch = ann.url.match(/\/r\/(\w+)\//)
            if (subMatch) post.subreddit = subMatch[1]
          }

          posts.push(post)
        }
      }

      // Also extract URLs from text body as fallback
      if (content.type === 'text' && content.text && posts.length < 5) {
        const urlRegex = /https?:\/\/[^\s\)]+/g
        const urls = content.text.match(urlRegex) || []
        for (const rawUrl of urls) {
          const url = rawUrl.replace(/[)\].,;:]+$/, '')
          const norm = url.replace(/\/$/, '').toLowerCase()
          if (seenUrls.has(norm)) continue

          if (sourceType === 'reddit') {
            if (!url.includes('reddit.com/r/') || !url.includes('/comments/')) continue
          } else {
            if (url.includes('reddit.com') || url.includes('news.ycombinator.com')) continue
          }

          seenUrls.add(norm)
          posts.push({
            title: url,
            url,
            source: sourceType === 'reddit' ? 'reddit' : 'web',
            subreddit: sourceType === 'reddit' ? url.match(/\/r\/(\w+)/)?.[1] : undefined,
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
