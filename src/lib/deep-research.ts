/**
 * Deep Research Engine for Pulse
 * Inspired by mvanhorn/last30days-skill — two-phase search with entity extraction
 * 
 * Phase 1: Initial broad search across Reddit + HN + Web
 * Phase 2: Extract entities (subreddits, handles) → drill deeper
 * Phase 3: Enrich Reddit threads with actual comments + engagement
 * Phase 4: Score, dedupe, send to Claude for synthesis
 */

import Anthropic from '@anthropic-ai/sdk'
import { searchX, searchXHandles } from './x-search'
import { searchRedditViaOpenAI, searchWebViaOpenAI } from './openai-search'

// ─── Query Intent Detection ───

type QueryType = 'prompting' | 'recommendations' | 'news' | 'general'

function detectQueryType(topic: string): QueryType {
  const lower = topic.toLowerCase()

  // Recommendations: "best X", "top X", "what X should I use"
  if (/^(best|top|recommended|favorite|which)\b/.test(lower) ||
      /should i (use|buy|try|get)/.test(lower) ||
      /alternatives to/.test(lower) ||
      /\bvs\b/.test(lower)) {
    return 'recommendations'
  }

  // News: "what's happening with X", "X news", "latest on X"
  if (/\b(news|update|announce|launch|release|happening|latest)\b/.test(lower)) {
    return 'news'
  }

  // Prompting: "X prompts", "prompting for X", "how to prompt"
  if (/\b(prompt|prompting|techniques|tips|practices|how to)\b/.test(lower)) {
    return 'prompting'
  }

  return 'general'
}

function buildSearchQueries(topic: string, queryType: QueryType): string[] {
  const queries = [topic]

  switch (queryType) {
    case 'recommendations':
      queries.push(`best ${topic}`)
      queries.push(`${topic} recommendations`)
      break
    case 'news':
      queries.push(`${topic} 2026`)
      queries.push(`${topic} announcement`)
      break
    case 'prompting':
      queries.push(`${topic} examples`)
      queries.push(`${topic} techniques tips`)
      break
    case 'general':
      queries.push(`${topic} discussion`)
      break
  }

  return queries
}

// ─── Types ───

export interface SourcePost {
  title: string
  url: string
  source: 'reddit' | 'hackernews' | 'youtube' | 'web' | 'x'
  subreddit?: string
  score: number
  comments: number
  created_at: string
  body?: string
  comment_insights?: string[]
  upvote_ratio?: number
}

export interface ResearchResult {
  topic: string
  brief: string
  sources: SourcePost[]
  queryType: QueryType
  stats: {
    reddit_threads: number
    reddit_upvotes: number
    reddit_comments: number
    hn_stories: number
    hn_points: number
    youtube_videos: number
    web_pages: number
    x_posts: number
  }
}

// ─── Phase 1: Broad Search ───

async function searchReddit(topic: string, subreddits?: string[]): Promise<SourcePost[]> {
  const posts: SourcePost[] = []
  const thirtyDaysAgo = Math.floor(Date.now() / 1000) - 30 * 24 * 60 * 60

  // Search main Reddit
  const queries = [topic]
  if (subreddits && subreddits.length > 0) {
    // Phase 2: search specific subreddits
    for (const sub of subreddits.slice(0, 5)) {
      queries.push(`${topic} subreddit:${sub}`)
    }
  }

  for (const query of queries) {
    try {
      const url = `https://www.reddit.com/search.json?q=${encodeURIComponent(query)}&sort=top&t=month&limit=25`
      const res = await fetch(url, {
        headers: { 'User-Agent': 'Pulse/1.0 (trend research)' },
        signal: AbortSignal.timeout(10000),
      })

      if (!res.ok) continue
      const data = await res.json()
      const children = data?.data?.children || []

      for (const child of children) {
        const d = child?.data
        if (!d || !d.title) continue
        if (d.created_utc < thirtyDaysAgo) continue

        posts.push({
          title: d.title,
          url: `https://reddit.com${d.permalink}`,
          source: 'reddit',
          subreddit: d.subreddit,
          score: d.score || 0,
          comments: d.num_comments || 0,
          created_at: new Date(d.created_utc * 1000).toISOString(),
          body: (d.selftext || '').slice(0, 500),
          upvote_ratio: d.upvote_ratio,
        })
      }
    } catch {
      // Continue on individual query failure
    }
  }

  return posts
}

async function searchHN(topic: string): Promise<SourcePost[]> {
  const posts: SourcePost[] = []
  const thirtyDaysAgo = Math.floor(Date.now() / 1000) - 30 * 24 * 60 * 60

  try {
    const url = `https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(topic)}&tags=story&hitsPerPage=30&numericFilters=created_at_i>${thirtyDaysAgo}`
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) })
    if (!res.ok) return posts

    const data = await res.json()
    for (const hit of data.hits || []) {
      posts.push({
        title: hit.title || '',
        url: hit.url || `https://news.ycombinator.com/item?id=${hit.objectID}`,
        source: 'hackernews',
        score: hit.points || 0,
        comments: hit.num_comments || 0,
        created_at: hit.created_at || new Date().toISOString(),
      })
    }
  } catch {
    // Fail silently
  }

  return posts
}

async function searchYouTube(topic: string): Promise<SourcePost[]> {
  const apiKey = process.env.YOUTUBE_API_KEY
  if (!apiKey) return []

  const posts: SourcePost[] = []
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

  try {
    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(topic)}&type=video&order=viewCount&publishedAfter=${thirtyDaysAgo}&maxResults=10&key=${apiKey}`
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) })
    if (!res.ok) return posts

    const data = await res.json()
    for (const item of data.items || []) {
      posts.push({
        title: item.snippet?.title || '',
        url: `https://www.youtube.com/watch?v=${item.id?.videoId}`,
        source: 'youtube',
        score: 0,
        comments: 0,
        created_at: item.snippet?.publishedAt || new Date().toISOString(),
      })
    }
  } catch {
    // Fail silently
  }

  return posts
}

// ─── Web Search (DuckDuckGo HTML scrape — no API key needed) ───

async function searchWeb(topic: string, queryType: QueryType): Promise<SourcePost[]> {
  const posts: SourcePost[] = []
  const queries = buildSearchQueries(topic, queryType)

  for (const query of queries.slice(0, 2)) {
    try {
      const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        },
        signal: AbortSignal.timeout(8000),
      })

      if (!res.ok) continue
      const html = await res.text()

      // Parse results from DuckDuckGo HTML
      const resultRegex = /<a rel="nofollow" class="result__a" href="([^"]+)"[^>]*>([^<]*(?:<b>[^<]*<\/b>[^<]*)*)<\/a>/g
      const snippetRegex = /<a class="result__snippet"[^>]*>([\s\S]*?)<\/a>/g

      const urls: string[] = []
      const titles: string[] = []
      let match

      while ((match = resultRegex.exec(html)) !== null) {
        const href = decodeURIComponent(match[1].replace(/\/\/duckduckgo\.com\/l\/\?uddg=/, '').split('&')[0])
        const title = match[2].replace(/<\/?b>/g, '').trim()
        if (href.startsWith('http') && title) {
          urls.push(href)
          titles.push(title)
        }
      }

      const snippets: string[] = []
      while ((match = snippetRegex.exec(html)) !== null) {
        snippets.push(match[1].replace(/<\/?b>/g, '').replace(/<[^>]+>/g, '').trim())
      }

      for (let i = 0; i < Math.min(urls.length, 8); i++) {
        // Skip Reddit/HN results (we get those directly)
        if (urls[i].includes('reddit.com') || urls[i].includes('news.ycombinator.com')) continue

        posts.push({
          title: titles[i] || '',
          url: urls[i],
          source: 'web',
          score: 0,
          comments: 0,
          created_at: new Date().toISOString(),
          body: snippets[i]?.slice(0, 300) || '',
        })
      }
    } catch {
      // Continue on failure
    }
  }

  return posts
}

// ─── Phase 2: Entity Extraction ───

interface ExtractedEntities {
  subreddits: string[]
  key_terms: string[]
}

function extractEntities(redditPosts: SourcePost[], hnPosts: SourcePost[]): ExtractedEntities {
  const subredditCounts: Record<string, number> = {}
  const termCounts: Record<string, number> = {}

  // Extract subreddits from Reddit results
  for (const post of redditPosts) {
    if (post.subreddit) {
      const sub = post.subreddit.toLowerCase()
      subredditCounts[sub] = (subredditCounts[sub] || 0) + 1
    }

    // Extract cross-referenced subreddits from body text
    const crossRefs = (post.body || '').match(/r\/(\w{2,30})/g)
    if (crossRefs) {
      for (const ref of crossRefs) {
        const sub = ref.replace('r/', '').toLowerCase()
        subredditCounts[sub] = (subredditCounts[sub] || 0) + 1
      }
    }
  }

  // Extract key terms from titles (simple frequency analysis)
  const allTitles = [...redditPosts, ...hnPosts].map(p => p.title.toLowerCase())
  const stopWords = new Set(['the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been',
    'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
    'should', 'may', 'might', 'can', 'shall', 'to', 'of', 'in', 'for', 'on', 'with',
    'at', 'by', 'from', 'as', 'into', 'through', 'during', 'before', 'after', 'and',
    'but', 'or', 'not', 'no', 'it', 'its', 'this', 'that', 'these', 'those', 'i',
    'you', 'he', 'she', 'we', 'they', 'my', 'your', 'his', 'her', 'our', 'their',
    'what', 'which', 'who', 'when', 'where', 'why', 'how', 'all', 'each', 'every',
    'both', 'few', 'more', 'most', 'other', 'some', 'such', 'than', 'too', 'very',
    'just', 'about', 'so', 'up', 'out', 'if', 'then', 'also', 'new', 'like', 'get'])

  for (const title of allTitles) {
    const words = title.replace(/[^a-z0-9\s]/g, '').split(/\s+/)
    for (const word of words) {
      if (word.length > 3 && !stopWords.has(word)) {
        termCounts[word] = (termCounts[word] || 0) + 1
      }
    }
  }

  // Sort by frequency, take top entries
  const topSubreddits = Object.entries(subredditCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([sub]) => sub)

  const topTerms = Object.entries(termCounts)
    .filter(([, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([term]) => term)

  return { subreddits: topSubreddits, key_terms: topTerms }
}

// ─── X Handle Extraction (for Phase 2 drill) ───

function extractXHandles(xPosts: SourcePost[]): string[] {
  const handleCounts: Record<string, number> = {}

  const genericHandles = new Set([
    'elonmusk', 'openai', 'google', 'microsoft', 'apple', 'meta',
    'github', 'youtube', 'x', 'twitter', 'reddit',
  ])

  for (const post of xPosts) {
    // Extract handle from title (@handle: ...)
    const handleMatch = post.title.match(/@(\w{1,15})/)
    if (handleMatch) {
      const handle = handleMatch[1].toLowerCase()
      if (!genericHandles.has(handle)) {
        handleCounts[handle] = (handleCounts[handle] || 0) + 1
      }
    }

    // Extract mentions from body
    const mentions = (post.body || '').match(/@(\w{1,15})/g)
    if (mentions) {
      for (const mention of mentions) {
        const handle = mention.replace('@', '').toLowerCase()
        if (!genericHandles.has(handle)) {
          handleCounts[handle] = (handleCounts[handle] || 0) + 1
        }
      }
    }
  }

  return Object.entries(handleCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([handle]) => handle)
}

// ─── Phase 3: Reddit Enrichment ───

async function enrichRedditPost(post: SourcePost): Promise<SourcePost> {
  try {
    // Fetch the actual thread JSON for real engagement data + top comments
    const jsonUrl = post.url.replace(/\/$/, '') + '.json'
    const res = await fetch(jsonUrl, {
      headers: { 'User-Agent': 'Pulse/1.0 (trend research)' },
      signal: AbortSignal.timeout(8000),
    })

    if (!res.ok) return post

    const data = await res.json()
    if (!Array.isArray(data) || data.length < 2) return post

    // Get actual submission data
    const submission = data[0]?.data?.children?.[0]?.data
    if (submission) {
      post.score = submission.score || post.score
      post.comments = submission.num_comments || post.comments
      post.upvote_ratio = submission.upvote_ratio
      if (submission.selftext) {
        post.body = submission.selftext.slice(0, 500)
      }
    }

    // Get top comments
    const comments = data[1]?.data?.children || []
    const insights: string[] = []

    const skipPatterns = [/^(this|same|agreed|exactly|yep|nope|yes|no|thanks)\.?$/i, /^lol|lmao|haha/i]

    for (const child of comments) {
      if (child.kind !== 't1') continue
      const body = child.data?.body?.trim()
      if (!body || body.length < 30) continue
      if (child.data?.author === '[deleted]') continue
      if (skipPatterns.some(p => p.test(body))) continue

      const insight = body.length > 200 ? body.slice(0, 200) + '...' : body
      insights.push(insight)
      if (insights.length >= 5) break
    }

    post.comment_insights = insights
  } catch {
    // Enrichment is best-effort
  }

  return post
}

// ─── Phase 4: Deduplicate + Score ───

function deduplicateAndScore(posts: SourcePost[]): SourcePost[] {
  // Deduplicate by URL
  const seen = new Set<string>()
  const unique: SourcePost[] = []

  for (const post of posts) {
    const normalizedUrl = post.url.replace(/\/$/, '').toLowerCase()
    if (seen.has(normalizedUrl)) continue
    seen.add(normalizedUrl)
    unique.push(post)
  }

  // Score: engagement * recency
  const now = Date.now()
  return unique.sort((a, b) => {
    const scoreA = (a.score + a.comments * 2) * recencyMultiplier(a.created_at, now)
    const scoreB = (b.score + b.comments * 2) * recencyMultiplier(b.created_at, now)
    return scoreB - scoreA
  })
}

function recencyMultiplier(dateStr: string, now: number): number {
  const age = now - new Date(dateStr).getTime()
  const days = age / (1000 * 60 * 60 * 24)
  if (days <= 7) return 1.5   // Last week gets a boost
  if (days <= 14) return 1.2
  return 1.0
}

// ─── Main Research Pipeline ───

export async function deepResearch(
  topic: string,
  apiKey?: string,
): Promise<ResearchResult> {
  // ── Detect query intent ──
  const queryType = detectQueryType(topic)

  // ── Phase 1: Broad initial search (parallel) ──
  // Use OpenAI web_search for Reddit discovery (finds threads Reddit's own search misses)
  // and general web search (replaces DuckDuckGo hack). Fall back to direct APIs if OpenAI unavailable.
  const [openaiReddit, directReddit, hnPosts, ytPosts, openaiWeb, ddgWeb, xPhase1] = await Promise.all([
    searchRedditViaOpenAI(topic).catch(() => [] as SourcePost[]),
    searchReddit(topic),
    searchHN(topic),
    searchYouTube(topic),
    searchWebViaOpenAI(topic, queryType).catch(() => [] as SourcePost[]),
    searchWeb(topic, queryType), // DDG fallback
    searchX(topic),
  ])

  // Merge Reddit: OpenAI-discovered + direct API (dedup handles overlaps)
  const redditPhase1 = [...openaiReddit, ...directReddit]
  // Merge Web: OpenAI + DDG fallback
  const webPosts = openaiWeb.length > 0 ? openaiWeb : ddgWeb

  // ── Phase 2: Entity extraction + supplemental search ──
  const entities = extractEntities(redditPhase1, hnPosts)

  // Phase 2 searches (parallel)
  const phase2Promises: Promise<SourcePost[]>[] = []

  if (entities.subreddits.length > 0) {
    phase2Promises.push(searchReddit(topic, entities.subreddits))
  } else {
    phase2Promises.push(Promise.resolve([]))
  }

  // Extract X handles from phase 1 results for targeted follow-up
  const xHandles = extractXHandles(xPhase1)
  if (xHandles.length > 0) {
    phase2Promises.push(searchXHandles(topic, xHandles))
  } else {
    phase2Promises.push(Promise.resolve([]))
  }

  const [redditPhase2, xPhase2] = await Promise.all(phase2Promises)

  // Merge all Reddit results
  const allReddit = [...redditPhase1, ...redditPhase2]

  // ── Phase 3: Enrich top Reddit threads ──
  const deduped = deduplicateAndScore(allReddit)
  const topReddit = deduped.slice(0, 15) // Enrich top 15

  // Enrich in parallel (max 5 concurrent to respect rate limits)
  const enriched: SourcePost[] = []
  for (let i = 0; i < topReddit.length; i += 5) {
    const batch = topReddit.slice(i, i + 5)
    const results = await Promise.all(batch.map(enrichRedditPost))
    enriched.push(...results)
  }

  // Merge all X posts
  const allX = [...xPhase1, ...xPhase2]

  // Add remaining Reddit posts (unenriched) + HN + YouTube + Web + X
  const remainingReddit = deduped.slice(15)
  const allSources = deduplicateAndScore([...enriched, ...remainingReddit, ...hnPosts, ...ytPosts, ...webPosts, ...allX])

  // ── Phase 4: Claude synthesis ──
  const stats = {
    reddit_threads: allReddit.length,
    reddit_upvotes: allReddit.reduce((sum, p) => sum + p.score, 0),
    reddit_comments: allReddit.reduce((sum, p) => sum + p.comments, 0),
    hn_stories: hnPosts.length,
    hn_points: hnPosts.reduce((sum, p) => sum + p.score, 0),
    youtube_videos: ytPosts.length,
    web_pages: webPosts.length,
    x_posts: allX.length,
  }

  const brief = await synthesizeWithClaude(topic, allSources.slice(0, 40), stats, queryType, apiKey)

  return {
    topic,
    brief,
    sources: allSources.slice(0, 50),
    queryType,
    stats,
  }
}

// ─── Claude Synthesis ───

async function synthesizeWithClaude(
  topic: string,
  sources: SourcePost[],
  stats: { reddit_threads: number; reddit_upvotes: number; reddit_comments: number; hn_stories: number; hn_points: number; youtube_videos: number; web_pages: number; x_posts: number },
  queryType: QueryType,
  apiKey?: string,
): Promise<string> {
  const key = apiKey || process.env.ANTHROPIC_API_KEY
  if (!key) {
    return generateFallbackBrief(topic, sources, stats)
  }

  const client = new Anthropic({ apiKey: key })

  const queryTypeInstructions: Record<QueryType, string> = {
    recommendations: 'The user is looking for SPECIFIC RECOMMENDATIONS. Focus on naming specific tools, products, or solutions. Compare options. Give a clear "best for X" verdict.',
    news: 'The user wants NEWS and UPDATES. Focus on what happened recently, key announcements, and what it means. Timeline the events.',
    prompting: 'The user wants TECHNIQUES and BEST PRACTICES. Focus on specific methods, examples, and copy-paste-ready advice.',
    general: 'The user wants a BROAD UNDERSTANDING of this topic. Cover all angles — what people are saying, debating, and predicting.',
  }

  const systemPrompt = `You are Pulsed, an expert trend intelligence analyst. You create concise, actionable trend briefs for marketing and sales teams.

Your briefs are structured, cite specific posts, and give people content they can act on immediately. Be specific — reference actual posts, actual numbers, actual patterns. No generic filler.

${queryTypeInstructions[queryType]}`

  const sourcesText = sources.map((s, i) => {
    let text = `[${i + 1}] "${s.title}" — ${s.source}${s.subreddit ? ` (r/${s.subreddit})` : ''} | Score: ${s.score} | Comments: ${s.comments} | ${s.created_at.slice(0, 10)}`
    if (s.body) text += `\n    Body: ${s.body.slice(0, 200)}`
    if (s.comment_insights?.length) {
      text += `\n    Top comments:\n${s.comment_insights.map(c => `      - ${c}`).join('\n')}`
    }
    return text
  }).join('\n\n')

  const userPrompt = `Research "${topic}" — last 30 days.

Stats: ${stats.reddit_threads} Reddit threads (${stats.reddit_upvotes} upvotes, ${stats.reddit_comments} comments) + ${stats.hn_stories} HN stories (${stats.hn_points} points) + ${stats.x_posts} X/Twitter posts + ${stats.youtube_videos} YouTube videos + ${stats.web_pages} web pages.
Query type: ${queryType}

Sources:
${sourcesText}

Write a trend brief with these sections:

## Key Themes
3-5 major themes with 1-2 sentence explanations. Reference specific posts [by number].

## Sentiment
Overall positive/negative/mixed with percentage estimate. What's driving the sentiment?

## Top Posts
The 8-10 most important posts. For each: title, source, why it matters (one line). Include links.

## Viral Hooks
Actual phrases, framings, or angles getting engagement. These are content goldmines.

## Content Ideas
5 specific, ready-to-use content angles for marketing/sales teams. Not generic — based on what's actually trending.

Be concise but specific. Every claim should reference a source.`

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4000,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }],
  })

  const textBlock = response.content.find(b => b.type === 'text')
  return textBlock?.text || generateFallbackBrief(topic, sources, stats)
}

function generateFallbackBrief(
  topic: string,
  sources: SourcePost[],
  stats: { reddit_threads: number; hn_stories: number },
): string {
  const topPosts = sources.slice(0, 10)
  return `# Trend Brief: "${topic}"

## Sources Found
- Reddit: ${stats.reddit_threads} threads
- Hacker News: ${stats.hn_stories} stories

## Top Posts
${topPosts.map((p, i) => `${i + 1}. **${p.title}** — ${p.source}${p.subreddit ? ` (r/${p.subreddit})` : ''} | Score: ${p.score} | [Link](${p.url})`).join('\n')}

*Note: AI analysis unavailable. Showing raw results. Add your Claude API key for full trend briefs.*`
}
