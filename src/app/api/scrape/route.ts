import { NextRequest, NextResponse } from 'next/server'
import { fetchAndExtract } from '@/lib/scraper'

// Rate limiting: max 10 scrapes per request
const MAX_SCRAPES_PER_REQUEST = 10

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      )
    }
    
    const { urls } = body as { urls?: string[] }
    
    if (!urls || !Array.isArray(urls) || urls.length === 0) {
      return NextResponse.json(
        { error: 'URLs array is required' },
        { status: 400 }
      )
    }
    
    if (urls.length > MAX_SCRAPES_PER_REQUEST) {
      return NextResponse.json(
        { error: `Maximum ${MAX_SCRAPES_PER_REQUEST} URLs allowed per request` },
        { status: 400 }
      )
    }
    
    // Validate URLs
    const validUrls: string[] = []
    for (const url of urls) {
      try {
        const parsed = new URL(url)
        if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
          validUrls.push(url)
        }
      } catch {
        // Invalid URL, skip
      }
    }
    
    if (validUrls.length === 0) {
      return NextResponse.json(
        { error: 'No valid URLs provided' },
        { status: 400 }
      )
    }
    
    // Scrape URLs in parallel with concurrency limit
    const results = await Promise.allSettled(
      validUrls.map(async (url) => {
        try {
          const content = await fetchAndExtract(url)
          return {
            url,
            success: true,
            data: content
          }
        } catch (error) {
          return {
            url,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          }
        }
      })
    )
    
    // Format results
    const scrapedResults = results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value
      } else {
        return {
          url: validUrls[index],
          success: false,
          error: 'Failed to scrape URL'
        }
      }
    })
    
    // Count successes and failures
    const successful = scrapedResults.filter(r => r.success).length
    const failed = scrapedResults.filter(r => !r.success).length
    
    return NextResponse.json({
      results: scrapedResults,
      stats: {
        total: validUrls.length,
        successful,
        failed
      }
    })
    
  } catch (error) {
    console.error('Scrape API error:', error)
    
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