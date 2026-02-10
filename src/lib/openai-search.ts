/**
 * OpenAI Responses API with web_search tool
 * Same approach as mvanhorn/last30days-skill — uses OpenAI's built-in web search
 * to discover Reddit threads, web articles, and general content.
 * 
 * This is superior to direct Reddit search (Reddit's search is notoriously bad)
 * and superior to DDG HTML scraping (proper structured results with full context).
 */

import type { SourcePost } from './types'

const OPENAI_RESPONSES_URL = 'https://api.openai.com/v1/responses'

// Model fallback order (same as last30days)
const MODEL_FALLBACK_ORDER = ['gpt-4.1-mini', 'gpt-4.1', 'gpt-4o-mini']

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
    // web_search_call results
    action?: {
      type: string
      sources?: Array<{
        url: string
        title: string
        snippet?: string
      }>
    }
  }>
}

/**
 * Search Reddit via OpenAI's web_search tool
 * OpenAI finds threads that Reddit's own search misses
 */
export async function searchRedditViaOpenAI(
  topic: string,
  depth: 'quick' | 'default' | 'deep' = 'default',
): Promise<SourcePost[]> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) return []

  const depthConfig = {
    quick: { min: 10, max: 20 },
    default: { min: 25, max: 40 },
    deep: { min: 50, max: 70 },
  }

  const { min, max } = depthConfig[depth]

  const prompt = `Find Reddit discussion threads about: ${topic}

STEP 1: EXTRACT THE CORE SUBJECT
Get the MAIN NOUN/PRODUCT/TOPIC:
- "best AI tools for sales" → "AI tools sales"
- "Salesforce alternatives" → "Salesforce alternatives"
DO NOT include filler words like "best", "top", "tips" in your search.

STEP 2: SEARCH BROADLY
Search for the core subject on Reddit:
1. "[core subject] site:reddit.com"
2. "reddit [core subject]"

Return as many relevant threads as you find from the last 30 days.

STEP 3: For each thread found, provide:
- The exact Reddit URL (must contain /r/ and /comments/)
- The thread title
- The subreddit name
- Approximate score/upvotes if visible
- A 1-2 sentence summary of what the thread discusses

Find ${min}-${max} threads. Return MORE rather than fewer. Include all relevant results.`

  return await executeWebSearch(apiKey, prompt, 'reddit')
}

/**
 * Search the general web via OpenAI's web_search tool
 * Replaces the DuckDuckGo HTML scraping hack
 */
export async function searchWebViaOpenAI(
  topic: string,
  queryType: string,
): Promise<SourcePost[]> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) return []

  const queryTypeInstructions: Record<string, string> = {
    recommendations: `Search for: "${topic} best recommendations", "${topic} comparison review". Find articles that NAME specific tools, products, or solutions.`,
    news: `Search for: "${topic} news 2026", "${topic} announcement latest". Find recent news articles and announcements.`,
    prompting: `Search for: "${topic} techniques examples 2026", "${topic} best practices guide". Find practical how-to content.`,
    general: `Search for: "${topic} 2026", "${topic} analysis discussion". Find substantive articles and discussions.`,
  }

  const prompt = `Search the web for content about: ${topic}

${queryTypeInstructions[queryType] || queryTypeInstructions.general}

For each result, provide:
- The URL
- The page title
- A 2-3 sentence summary of the key content
- The publication date if visible

Find 10-15 high-quality, substantive results. Skip:
- Reddit threads (we search those separately)
- Hacker News (we search that separately)  
- Low-quality SEO spam or listicles with no substance
- Results older than 30 days

Prioritize: Industry blogs, news outlets, company announcements, research papers, expert analyses.`

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
  for (const model of MODEL_FALLBACK_ORDER) {
    try {
      const payload = {
        model,
        input: prompt,
        tools: [
          {
            type: 'web_search' as const,
          },
        ],
        include: ['web_search_call.action.sources'],
      }

      const response = await fetch(OPENAI_RESPONSES_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(60000), // Generous timeout — web search can be slow
      })

      if (!response.ok) {
        const errorText = await response.text().catch(() => '')
        // Check if it's a model access error
        if (response.status === 400 || response.status === 403) {
          const lower = errorText.toLowerCase()
          if (lower.includes('verified') || lower.includes('not available') || lower.includes('not found')) {
            console.error(`[SEARCH] Model ${model} not available, trying next...`)
            continue // Try next model
          }
        }
        console.error(`[SEARCH] OpenAI API error (${response.status}):`, errorText.slice(0, 200))
        continue
      }

      const data: OpenAIWebSearchResult = await response.json()
      return parseOpenAIResults(data, sourceType)
    } catch (error) {
      console.error(`[SEARCH] Error with model ${model}:`, error)
      continue
    }
  }

  return [] // All models failed
}

/**
 * Parse OpenAI Responses API results into SourcePost objects
 */
function parseOpenAIResults(
  data: OpenAIWebSearchResult,
  sourceType: 'reddit' | 'web',
): SourcePost[] {
  const posts: SourcePost[] = []
  const seenUrls = new Set<string>()

  for (const output of data.output || []) {
    // Extract from web_search_call sources (structured data)
    if (output.action?.sources) {
      for (const source of output.action.sources) {
        if (seenUrls.has(source.url)) continue

        // Filter based on source type
        if (sourceType === 'reddit') {
          if (!source.url.includes('reddit.com/r/') || !source.url.includes('/comments/')) continue
        } else {
          // Skip Reddit and HN for web results
          if (source.url.includes('reddit.com') || source.url.includes('news.ycombinator.com')) continue
        }

        seenUrls.add(source.url)

        const post: SourcePost = {
          title: source.title || '',
          url: source.url,
          source: sourceType === 'reddit' ? 'reddit' : 'web',
          score: 0,
          comments: 0,
          created_at: new Date().toISOString(),
          body: source.snippet || '',
        }

        // Extract subreddit from Reddit URL
        if (sourceType === 'reddit') {
          const subMatch = source.url.match(/\/r\/(\w+)\//)
          if (subMatch) {
            post.subreddit = subMatch[1]
          }
        }

        posts.push(post)
      }
    }

    // Also extract from message content (annotations contain URLs)
    if (output.type === 'message' && output.content) {
      for (const content of output.content) {
        if (content.annotations) {
          for (const annotation of content.annotations) {
            if (annotation.type === 'url_citation' && annotation.url) {
              if (seenUrls.has(annotation.url)) continue

              if (sourceType === 'reddit') {
                if (!annotation.url.includes('reddit.com/r/') || !annotation.url.includes('/comments/')) continue
              } else {
                if (annotation.url.includes('reddit.com') || annotation.url.includes('news.ycombinator.com')) continue
              }

              seenUrls.add(annotation.url)

              const post: SourcePost = {
                title: annotation.title || annotation.url,
                url: annotation.url,
                source: sourceType === 'reddit' ? 'reddit' : 'web',
                score: 0,
                comments: 0,
                created_at: new Date().toISOString(),
              }

              if (sourceType === 'reddit') {
                const subMatch = annotation.url.match(/\/r\/(\w+)\//)
                if (subMatch) {
                  post.subreddit = subMatch[1]
                }
              }

              posts.push(post)
            }
          }
        }
      }
    }
  }

  return posts
}
