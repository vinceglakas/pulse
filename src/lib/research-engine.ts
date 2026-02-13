/**
 * Research Engine for Agent Chat — Supercharged Edition
 *
 * Multi-source deep research that returns raw context strings for injection
 * into the agent's system prompt. Uses ALL available sources in parallel:
 *
 *   1. OpenAI web_search (PRIMARY — AI-synthesized overview with citations)
 *   2. Brave web search (supplemental web results)
 *   3. Reddit (direct JSON API with top-comment enrichment)
 *   4. Hacker News (Algolia API)
 *   5. YouTube (via API key or graceful skip)
 *
 * All sources are fetched in parallel via Promise.allSettled with individual
 * 5s timeouts. If any source fails, the rest still return.
 */

// ─── Types ───

interface WebResult {
  title: string;
  url: string;
  snippet: string;
}

interface RedditResult {
  subreddit: string;
  title: string;
  url: string;
  score: number;
  numComments: number;
  topComment?: string;
}

interface HNResult {
  title: string;
  url: string;
  points: number;
  numComments: number;
}

interface YouTubeResult {
  title: string;
  url: string;
  channel: string;
}

export interface ResearchContext {
  query: string;
  sources: {
    web: WebResult[];
    reddit: RedditResult[];
    hn: HNResult[];
    youtube: YouTubeResult[];
    openaiSummary?: string;
  };
  totalSources: number;
  contextString: string;
}

// Per-source timeouts — tuned by source reliability/speed
const OPENAI_TIMEOUT_MS = 15000; // OpenAI web_search is the gold — give it time
const BRAVE_TIMEOUT_MS = 8000;
const REDDIT_TIMEOUT_MS = 8000;
const HN_TIMEOUT_MS = 5000;     // Algolia is fast
const YOUTUBE_TIMEOUT_MS = 8000;

// Helper: create an AbortSignal with timeout (compatible with all runtimes)
function timeoutSignal(ms: number): AbortSignal {
  const controller = new AbortController();
  setTimeout(() => controller.abort(), ms);
  return controller.signal;
}

// ─── 1. OpenAI web_search (Primary) ───

async function searchOpenAI(
  query: string,
  openaiKey?: string,
): Promise<{ summary: string; webResults: WebResult[] }> {
  const apiKey = openaiKey || process.env.OPENAI_API_KEY;
  if (!apiKey) return { summary: '', webResults: [] };

  try {
    const res = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4.1-mini',
        tools: [{ type: 'web_search_preview' }],
        input: `Search the web thoroughly for: ${query}. Include Reddit discussions, news articles, forum posts, and expert opinions. Provide a comprehensive summary with specific facts and data points.`,
      }),
      signal: timeoutSignal(OPENAI_TIMEOUT_MS),
    });

    if (!res.ok) {
      console.error('[research-engine] OpenAI web_search error:', res.status);
      return { summary: '', webResults: [] };
    }

    const data = await res.json();
    let summary = '';
    const webResults: WebResult[] = [];
    const seenUrls = new Set<string>();

    for (const output of data.output || []) {
      if (output.type !== 'message' || !output.content) continue;
      for (const content of output.content) {
        // Handle both 'text' and 'output_text' content types from Responses API
        if ((content.type === 'text' || content.type === 'output_text') && content.text) {
          summary = content.text;
        }
        // Extract cited URLs as web results
        if (content.annotations) {
          for (const ann of content.annotations) {
            if (ann.type !== 'url_citation' || !ann.url) continue;
            const norm = ann.url.replace(/\/$/, '').toLowerCase();
            if (seenUrls.has(norm)) continue;
            // Skip reddit/HN (we fetch those directly)
            if (ann.url.includes('reddit.com') || ann.url.includes('news.ycombinator.com')) continue;
            seenUrls.add(norm);
            webResults.push({
              title: ann.title || ann.url,
              url: ann.url,
              snippet: '', // The summary itself contains the context
            });
          }
        }
      }
    }

    return { summary, webResults };
  } catch (e: any) {
    console.error('[research-engine] OpenAI web_search exception:', e.message);
    return { summary: '', webResults: [] };
  }
}

// ─── 2. Brave Web Search ───

async function searchBrave(query: string): Promise<WebResult[]> {
  const apiKey = process.env.BRAVE_API_KEY;
  if (!apiKey) return [];

  try {
    const url = `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=8`;
    const res = await fetch(url, {
      headers: { 'X-Subscription-Token': apiKey, Accept: 'application/json' },
      signal: timeoutSignal(BRAVE_TIMEOUT_MS),
    });
    if (!res.ok) return [];

    const data = await res.json();
    return (data.web?.results || []).slice(0, 8).map((r: any) => ({
      title: r.title || '',
      url: r.url || '',
      snippet: r.description || '',
    }));
  } catch {
    return [];
  }
}

// ─── 3. Reddit Search ───

async function searchReddit(query: string): Promise<RedditResult[]> {
  const results: RedditResult[] = [];

  try {
    const url = `https://www.reddit.com/search.json?q=${encodeURIComponent(query)}&sort=relevance&t=month&limit=10`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Pulse/1.0 (agent research)' },
      signal: timeoutSignal(REDDIT_TIMEOUT_MS),
    });
    if (!res.ok) return [];

    const data = await res.json();
    const children = data?.data?.children || [];

    for (const child of children.slice(0, 8)) {
      const d = child?.data;
      if (!d || !d.title) continue;

      results.push({
        subreddit: d.subreddit || 'unknown',
        title: d.title,
        url: `https://reddit.com${d.permalink}`,
        score: d.score || 0,
        numComments: d.num_comments || 0,
      });
    }

    // Enrich top 3 posts with their best comment (parallel, best-effort)
    const enrichPromises = results.slice(0, 3).map(async (post, idx) => {
      try {
        const jsonUrl = post.url.replace(/\/$/, '') + '.json';
        const commentRes = await fetch(jsonUrl, {
          headers: { 'User-Agent': 'Pulse/1.0 (agent research)' },
          signal: timeoutSignal(5000),
        });
        if (!commentRes.ok) return;

        const commentData = await commentRes.json();
        if (!Array.isArray(commentData) || commentData.length < 2) return;

        const comments = commentData[1]?.data?.children || [];
        for (const c of comments) {
          if (c.kind !== 't1') continue;
          const body = c.data?.body?.trim();
          if (!body || body.length < 30 || c.data?.author === '[deleted]') continue;
          results[idx].topComment = body.length > 200 ? body.slice(0, 200) + '...' : body;
          break;
        }
      } catch {
        // Best-effort enrichment
      }
    });

    await Promise.all(enrichPromises);
  } catch {
    // Fail silently
  }

  return results;
}

// ─── 4. Hacker News Search ───

async function searchHN(query: string): Promise<HNResult[]> {
  try {
    const url = `https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(query)}&tags=story&hitsPerPage=6`;
    const res = await fetch(url, { signal: timeoutSignal(HN_TIMEOUT_MS) });
    if (!res.ok) return [];

    const data = await res.json();
    return (data.hits || []).slice(0, 6).map((hit: any) => ({
      title: hit.title || '',
      url: hit.url || `https://news.ycombinator.com/item?id=${hit.objectID}`,
      points: hit.points || 0,
      numComments: hit.num_comments || 0,
    }));
  } catch {
    return [];
  }
}

// ─── 5. YouTube Search ───

async function searchYouTube(query: string): Promise<YouTubeResult[]> {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) return [];

  try {
    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&maxResults=3&type=video&key=${apiKey}`;
    const res = await fetch(url, { signal: timeoutSignal(YOUTUBE_TIMEOUT_MS) });
    if (!res.ok) return [];

    const data = await res.json();
    return (data.items || []).map((item: any) => ({
      title: item.snippet?.title || '',
      url: `https://youtube.com/watch?v=${item.id?.videoId}`,
      channel: item.snippet?.channelTitle || '',
    }));
  } catch {
    return [];
  }
}

// ─── Format Context String ───

function formatContextString(ctx: ResearchContext): string {
  const sections: string[] = [];
  sections.push(
    `[DEEP RESEARCH — ${ctx.totalSources} sources analyzed for "${ctx.query}"]`,
  );

  // AI-synthesized overview (the gold)
  if (ctx.sources.openaiSummary) {
    sections.push(`\nAI-SYNTHESIZED OVERVIEW:\n${ctx.sources.openaiSummary}`);
  }

  // Web sources (merged OpenAI citations + Brave, deduped)
  if (ctx.sources.web.length > 0) {
    const webLines = ctx.sources.web.map(
      (r, i) =>
        `${i + 1}. ${r.title}${r.snippet ? ` — ${r.snippet}` : ''} (${r.url})`,
    );
    sections.push(`\nWEB SOURCES:\n${webLines.join('\n')}`);
  }

  // Reddit discussions
  if (ctx.sources.reddit.length > 0) {
    const redditLines = ctx.sources.reddit.map((r) => {
      let line = `- r/${r.subreddit}: ${r.title} (${r.score} upvotes)`;
      if (r.topComment) {
        line += `\n  Top insight: "${r.topComment}"`;
      }
      return line;
    });
    sections.push(`\nREDDIT DISCUSSIONS:\n${redditLines.join('\n')}`);
  }

  // Hacker News
  if (ctx.sources.hn.length > 0) {
    const hnLines = ctx.sources.hn.map(
      (r) => `- ${r.title} (${r.points} pts, ${r.numComments} comments) — ${r.url}`,
    );
    sections.push(`\nHACKER NEWS:\n${hnLines.join('\n')}`);
  }

  // YouTube
  if (ctx.sources.youtube.length > 0) {
    const ytLines = ctx.sources.youtube.map(
      (r) => `- ${r.title} by ${r.channel} — ${r.url}`,
    );
    sections.push(`\nYOUTUBE:\n${ytLines.join('\n')}`);
  }

  sections.push(
    '\nSynthesize these sources into a comprehensive, well-sourced response. Reference specific sources when relevant.',
  );

  return sections.join('\n');
}

// ─── Dedup web results by domain-normalized URL ───

function dedupeWebResults(openaiResults: WebResult[], braveResults: WebResult[]): WebResult[] {
  const seen = new Set<string>();
  const deduped: WebResult[] = [];

  // OpenAI results first (higher quality)
  for (const r of openaiResults) {
    const norm = r.url.replace(/\/$/, '').toLowerCase();
    if (!seen.has(norm)) {
      seen.add(norm);
      deduped.push(r);
    }
  }

  // Then Brave results, skip dupes
  for (const r of braveResults) {
    const norm = r.url.replace(/\/$/, '').toLowerCase();
    if (!seen.has(norm)) {
      seen.add(norm);
      deduped.push(r);
    }
  }

  return deduped.slice(0, 12);
}

// ─── Main Exports ───

export interface DeepResearchOptions {
  sources?: ('web' | 'reddit' | 'hn' | 'youtube')[];
  maxResults?: number;
  openaiKey?: string; // User's own OpenAI key (for web_search when provider is OpenAI)
}

/**
 * Runs a full deep research query across all sources in parallel.
 * Returns a structured ResearchContext with pre-formatted contextString
 * ready to inject into an LLM system prompt.
 *
 * All sources are fetched via Promise.allSettled — individual failures
 * are swallowed gracefully.
 */
export async function deepResearch(
  query: string,
  options?: DeepResearchOptions,
): Promise<ResearchContext> {
  const activeSources = options?.sources || ['web', 'reddit', 'hn', 'youtube'];
  const openaiKey = options?.openaiKey;

  // Build promise array based on requested sources
  const promises: Promise<any>[] = [];
  const sourceNames: string[] = [];

  if (activeSources.includes('web')) {
    promises.push(searchOpenAI(query, openaiKey));
    sourceNames.push('openai');
    promises.push(searchBrave(query));
    sourceNames.push('brave');
  }
  if (activeSources.includes('reddit')) {
    promises.push(searchReddit(query));
    sourceNames.push('reddit');
  }
  if (activeSources.includes('hn')) {
    promises.push(searchHN(query));
    sourceNames.push('hn');
  }
  if (activeSources.includes('youtube')) {
    promises.push(searchYouTube(query));
    sourceNames.push('youtube');
  }

  // Fire all in parallel
  const settled = await Promise.allSettled(promises);

  // Extract results by source name
  let openaiResult: { summary: string; webResults: WebResult[] } = { summary: '', webResults: [] };
  let braveResults: WebResult[] = [];
  let redditResults: RedditResult[] = [];
  let hnResults: HNResult[] = [];
  let youtubeResults: YouTubeResult[] = [];

  for (let i = 0; i < settled.length; i++) {
    const result = settled[i];
    if (result.status !== 'fulfilled') {
      console.error(`[research-engine] ${sourceNames[i]} failed:`, (result as PromiseRejectedResult).reason);
      continue;
    }

    switch (sourceNames[i]) {
      case 'openai':
        openaiResult = result.value;
        break;
      case 'brave':
        braveResults = result.value;
        break;
      case 'reddit':
        redditResults = result.value;
        break;
      case 'hn':
        hnResults = result.value;
        break;
      case 'youtube':
        youtubeResults = result.value;
        break;
    }
  }

  // Merge and dedupe web results (OpenAI citations + Brave)
  const mergedWeb = dedupeWebResults(openaiResult.webResults, braveResults);

  const totalSources =
    mergedWeb.length + redditResults.length + hnResults.length + youtubeResults.length;

  const ctx: ResearchContext = {
    query,
    sources: {
      web: mergedWeb,
      reddit: redditResults,
      hn: hnResults,
      youtube: youtubeResults,
      openaiSummary: openaiResult.summary || undefined,
    },
    totalSources,
    contextString: '',
  };

  ctx.contextString = formatContextString(ctx);
  return ctx;
}

/**
 * Convenience wrapper for the chat route — returns just the context string
 * or empty string if no results found. Compatible with existing integration.
 */
export async function deepResearchForChat(
  query: string,
  openaiKey?: string,
): Promise<string> {
  const ctx = await deepResearch(query, { openaiKey });
  if (ctx.totalSources === 0 && !ctx.sources.openaiSummary) {
    return '';
  }
  return ctx.contextString;
}

/**
 * Supercharged research — hits ALL sources in parallel with optimized
 * per-source timeouts. Primary interface for the chat route.
 *
 * Uses OpenAI Responses API with web_search_preview as the primary
 * AI-synthesized source, backed by Brave, Reddit, HN, and YouTube.
 *
 * @param query - The search query
 * @param userOpenAIKey - Optional user-provided OpenAI key (BYOLLM).
 *   Falls back to platform OPENAI_API_KEY env var.
 */
export async function superchargedResearch(
  query: string,
  userOpenAIKey?: string,
): Promise<string> {
  const ctx = await deepResearch(query, { openaiKey: userOpenAIKey });
  if (ctx.totalSources === 0 && !ctx.sources.openaiSummary) {
    return '';
  }
  return ctx.contextString;
}
