/**
 * AI-Powered Web Search via xAI Grok-4
 * 
 * Single unified search call that discovers BOTH Reddit threads AND web articles.
 * Uses Grok-4 with web_search tool — one API call, all the AI-powered results.
 * 
 * This replaces the DuckDuckGo HTML scraping hack and matches the quality of
 * the last30days-skill's OpenAI web_search approach.
 */

import type { SourcePost } from './types'

const XAI_RESPONSES_URL = 'https://api.x.ai/v1/responses'

interface XAIWebSearchResult {
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
    status?: string
  }>
}

/**
 * Search Reddit via xAI Grok-4 web_search
 * Discovers threads Reddit's own terrible search misses
 */
export async function searchRedditViaOpenAI(
  topic: string,
): Promise<SourcePost[]> {
  const apiKey = process.env.XAI_API_KEY
  if (!apiKey) return []

  try {
    const response = await fetch(XAI_RESPONSES_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'grok-4',
        tools: [{ type: 'web_search' }],
        input: `Find Reddit discussion threads about "${topic}" from the last 30 days. Search: "${topic} site:reddit.com". List each result as:\nTITLE: ...\nURL: [full reddit.com URL]\nSUBREDDIT: ...\nSCORE: [number or 0]\n---\nFind 15-25 threads.`,
      }),
      signal: AbortSignal.timeout(90000),
    })

    if (!response.ok) {
      console.error(`[REDDIT_AI] xAI error (${response.status})`)
      return []
    }

    const data: XAIWebSearchResult = await response.json()
    return parseResults(data, 'reddit')
  } catch (error) {
    console.error(`[REDDIT_AI] Error:`, error instanceof Error ? error.message : error)
    return []
  }
}

/**
 * Search the general web via xAI Grok-4 web_search
 */
export async function searchWebViaOpenAI(
  topic: string,
  queryType: string,
): Promise<SourcePost[]> {
  const apiKey = process.env.XAI_API_KEY
  if (!apiKey) return []

  try {
    const response = await fetch(XAI_RESPONSES_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'grok-4',
        tools: [{ type: 'web_search' }],
        input: `Find 10-15 recent high-quality articles about "${topic}" (${queryType} focus, last 30 days). Skip Reddit and Hacker News. For each:\nTITLE: ...\nURL: ...\nSUMMARY: [1 sentence]\n---`,
      }),
      signal: AbortSignal.timeout(90000),
    })

    if (!response.ok) {
      console.error(`[WEB_AI] xAI error (${response.status})`)
      return []
    }

    const data: XAIWebSearchResult = await response.json()
    return parseResults(data, 'web')
  } catch (error) {
    console.error(`[WEB_AI] Error:`, error instanceof Error ? error.message : error)
    return []
  }
}

/**
 * Parse xAI Grok response into SourcePost objects
 */
function parseResults(data: XAIWebSearchResult, sourceType: 'reddit' | 'web'): SourcePost[] {
  const posts: SourcePost[] = []
  const seenUrls = new Set<string>()

  for (const output of data.output || []) {
    if (output.type !== 'message' || !output.content) continue

    for (const content of output.content) {
      if (content.type === 'text' && content.text) {
        // Parse structured blocks
        const blocks = content.text.split(/\n---\n?|\n\n(?=TITLE:)/)
        for (const block of blocks) {
          const titleMatch = block.match(/TITLE:\s*(.+?)(?:\n|$)/)
          const urlMatch = block.match(/URL:\s*(https?:\/\/\S+?)(?:\n|$|\s)/)
          const subMatch = block.match(/SUBREDDIT:\s*r?\/?([\w]+)/)
          const scoreMatch = block.match(/SCORE:\s*(\d+)/)
          const summaryMatch = block.match(/SUMMARY:\s*(.+?)(?:\n|$)/)

          if (!urlMatch) continue
          const url = urlMatch[1].replace(/[)\].,]+$/, '')
          const norm = url.replace(/\/$/, '').toLowerCase()
          if (seenUrls.has(norm)) continue

          if (sourceType === 'reddit' && !url.includes('reddit.com')) continue
          if (sourceType === 'web' && (url.includes('reddit.com') || url.includes('news.ycombinator.com'))) continue

          seenUrls.add(norm)
          posts.push({
            title: titleMatch ? titleMatch[1].trim() : url,
            url,
            source: sourceType === 'reddit' ? 'reddit' : 'web',
            subreddit: subMatch ? subMatch[1] : (sourceType === 'reddit' ? url.match(/\/r\/(\w+)/)?.[1] : undefined),
            score: scoreMatch ? parseInt(scoreMatch[1]) : 0,
            comments: 0,
            created_at: new Date().toISOString(),
            body: summaryMatch ? summaryMatch[1].trim().slice(0, 300) : '',
          })
        }

        // Fallback: extract URLs from raw text if structured parsing found nothing
        if (posts.length === 0) {
          const urlRegex = /https?:\/\/[^\s\)]+/g
          const urls = content.text.match(urlRegex) || []
          for (const rawUrl of urls) {
            const url = rawUrl.replace(/[)\].,;:]+$/, '')
            const norm = url.replace(/\/$/, '').toLowerCase()
            if (seenUrls.has(norm)) continue
            if (sourceType === 'reddit' && !url.includes('reddit.com')) continue
            if (sourceType === 'web' && (url.includes('reddit.com') || url.includes('news.ycombinator.com'))) continue

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

      // Also extract from citation annotations
      if (content.annotations) {
        for (const ann of content.annotations) {
          if (ann.type !== 'url_citation' || !ann.url) continue
          const norm = ann.url.replace(/\/$/, '').toLowerCase()
          if (seenUrls.has(norm)) continue
          if (sourceType === 'reddit' && !ann.url.includes('reddit.com')) continue
          if (sourceType === 'web' && (ann.url.includes('reddit.com') || ann.url.includes('news.ycombinator.com'))) continue

          seenUrls.add(norm)
          posts.push({
            title: ann.title || ann.url,
            url: ann.url,
            source: sourceType === 'reddit' ? 'reddit' : 'web',
            subreddit: sourceType === 'reddit' ? ann.url.match(/\/r\/(\w+)/)?.[1] : undefined,
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
