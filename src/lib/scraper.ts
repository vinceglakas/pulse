/**
 * Web scraping utility for extracting content from web pages
 */

import * as cheerio from 'cheerio'

export interface ScrapedContent {
  title: string
  description: string
  text: string
  links: string[]
  ogImage?: string
  author?: string
  publishedDate?: string
}

/**
 * Fetch a URL and extract readable content
 */
export async function fetchAndExtract(url: string): Promise<ScrapedContent> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; PulseBot/1.0; +https://pulsed.app)'
      },
      signal: AbortSignal.timeout(30000)
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const html = await response.text()
    return extractContent(html, url)
  } catch (error) {
    console.error(`Failed to fetch ${url}:`, error)
    throw error
  }
}

/**
 * Extract content from HTML
 */
export function extractContent(html: string, baseUrl?: string): ScrapedContent {
  const $ = cheerio.load(html)
  
  // Remove script and style elements
  $('script, style, nav, footer, header, aside, .advertisement, .ads, .social-share').remove()
  
  // Extract metadata
  const title = extractTitle($)
  const description = extractDescription($)
  const ogImage = extractOgImage($)
  const author = extractAuthor($)
  const publishedDate = extractPublishedDate($)
  
  // Extract main content
  const text = extractMainText($)
  
  // Extract links
  const links = extractLinks($, baseUrl)
  
  return {
    title,
    description,
    text,
    links,
    ogImage,
    author,
    publishedDate
  }
}

/**
 * Extract title from HTML
 */
export function extractTitle($: cheerio.CheerioAPI): string {
  // Try multiple sources in order of preference
  const titleSelectors = [
    'meta[property="og:title"]',
    'meta[name="twitter:title"]',
    'meta[name="title"]',
    'title',
    'h1'
  ]
  
  for (const selector of titleSelectors) {
    const element = $(selector).first()
    if (element.length) {
      const content = element.attr('content') || element.text()
      if (content?.trim()) {
        return content.trim()
      }
    }
  }
  
  return 'Untitled'
}

/**
 * Extract description from HTML
 */
export function extractDescription($: cheerio.CheerioAPI): string {
  const descSelectors = [
    'meta[property="og:description"]',
    'meta[name="twitter:description"]',
    'meta[name="description"]',
    'meta[name="summary"]'
  ]
  
  for (const selector of descSelectors) {
    const element = $(selector).first()
    if (element.length) {
      const content = element.attr('content')
      if (content?.trim()) {
        return content.trim()
      }
    }
  }
  
  // Fallback to first paragraph
  const firstP = $('p').first().text()
  if (firstP) {
    return firstP.trim().slice(0, 200)
  }
  
  return ''
}

/**
 * Extract OpenGraph image
 */
export function extractOgImage($: cheerio.CheerioAPI): string | undefined {
  const ogImage = $('meta[property="og:image"]').attr('content')
  return ogImage || undefined
}

/**
 * Extract author information
 */
export function extractAuthor($: cheerio.CheerioAPI): string | undefined {
  const authorSelectors = [
    'meta[name="author"]',
    'meta[property="article:author"]',
    '[rel="author"]',
    '.author',
    '.byline',
    '.post-author'
  ]
  
  for (const selector of authorSelectors) {
    const element = $(selector).first()
    if (element.length) {
      const content = element.attr('content') || element.text()
      if (content?.trim()) {
        return content.trim()
      }
    }
  }
  
  return undefined
}

/**
 * Extract published date
 */
export function extractPublishedDate($: cheerio.CheerioAPI): string | undefined {
  const dateSelectors = [
    'meta[property="article:published_time"]',
    'meta[name="date"]',
    'meta[name="publishdate"]',
    'time[datetime]',
    '.publish-date',
    '.post-date',
    '.entry-date'
  ]
  
  for (const selector of dateSelectors) {
    const element = $(selector).first()
    if (element.length) {
      const content = element.attr('content') || element.attr('datetime') || element.text()
      if (content?.trim()) {
        return content.trim()
      }
    }
  }
  
  return undefined
}

/**
 * Extract main text content from HTML
 */
export function extractMainText($: cheerio.CheerioAPI): string {
  // Try to find main content area
  const contentSelectors = [
    'article',
    '[role="main"]',
    'main',
    '.content',
    '.post-content',
    '.entry-content',
    '.article-content',
    '.post-body',
    '.post-text',
    '#content',
    '#main-content'
  ]
  
  let contentElement: cheerio.Cheerio<any> | null = null
  
  for (const selector of contentSelectors) {
    const element = $(selector).first()
    if (element.length && element.text().trim().length > 100) {
      contentElement = element
      break
    }
  }
  
  // If no main content found, use body but remove common non-content elements
  if (!contentElement) {
    contentElement = $('body').clone()
    contentElement.find('nav, footer, header, aside, .sidebar, .menu, .advertisement, .ads, .comments, .comment-section').remove()
  }
  
  // Extract text from paragraphs and headings
  const textElements = contentElement.find('p, h1, h2, h3, h4, h5, h6, li, blockquote')
  const texts: string[] = []
  
  textElements.each((_, element) => {
    const text = $(element).text().trim()
    if (text.length > 20) { // Only include substantial text
      texts.push(text)
    }
  })
  
  // If no text elements found, get all text
  if (texts.length === 0) {
    const allText = contentElement.text().trim()
    if (allText.length > 100) {
      return cleanText(allText)
    }
  }
  
  return cleanText(texts.join('\n\n'))
}

/**
 * Extract all links from the page
 */
export function extractLinks($: cheerio.CheerioAPI, baseUrl?: string): string[] {
  const links: string[] = []
  const seen = new Set<string>()
  
  $('a[href]').each((_, element) => {
    let href = $(element).attr('href')
    if (!href) return
    
    // Skip anchors, javascript, mailto, tel
    if (href.startsWith('#') || href.startsWith('javascript:') || href.startsWith('mailto:') || href.startsWith('tel:')) {
      return
    }
    
    // Convert relative URLs to absolute
    if (baseUrl && !href.startsWith('http')) {
      try {
        href = new URL(href, baseUrl).href
      } catch {
        return
      }
    }
    
    // Only include HTTP(S) links
    if (href.startsWith('http') && !seen.has(href)) {
      seen.add(href)
      links.push(href)
    }
  })
  
  return links.slice(0, 20) // Limit to 20 links
}

/**
 * Clean and normalize text
 */
export function cleanText(html: string): string {
  // Remove extra whitespace
  return html
    .replace(/\s+/g, ' ')
    .replace(/\n\s*\n/g, '\n\n')
    .trim()
}