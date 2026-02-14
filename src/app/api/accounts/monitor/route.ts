import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const maxDuration = 300 // 5 min for cron

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

function verifyCron(req: NextRequest): boolean {
  const authHeader = req.headers.get('authorization')
  if (authHeader === `Bearer ${process.env.CRON_SECRET}`) return true
  if (process.env.NODE_ENV === 'development') return true
  return false
}

interface BraveResult {
  title: string
  url: string
  description: string
  age?: string
}

async function searchBrave(query: string): Promise<BraveResult[]> {
  const apiKey = process.env.BRAVE_API_KEY
  if (!apiKey) return []

  try {
    const url = `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=10&freshness=pw`
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10000)

    const res = await fetch(url, {
      headers: { 'X-Subscription-Token': apiKey, Accept: 'application/json' },
      signal: controller.signal,
    })
    clearTimeout(timeout)

    if (!res.ok) return []
    const data = await res.json()
    return (data.web?.results || []).slice(0, 10).map((r: any) => ({
      title: r.title || '',
      url: r.url || '',
      description: r.description || '',
      age: r.age,
    }))
  } catch {
    return []
  }
}

function classifyType(title: string, snippet: string): string {
  const text = `${title} ${snippet}`.toLowerCase()
  if (/\brfp\b|request for proposal|solicitation|procurement/.test(text)) return 'rfp'
  if (/\bcontract\b|awarded|vendor|agreement/.test(text)) return 'contract'
  if (/\bceo\b|\bcto\b|\bcio\b|appointed|hired|resigned|leadership|director|chief/.test(text)) return 'leadership'
  if (/\bbudget\b|funding|appropriat|fiscal|allocation/.test(text)) return 'budget'
  return 'news'
}

export async function POST(req: NextRequest) {
  if (!verifyCron(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Get all active accounts across all users
    const { data: accounts, error: accErr } = await supabaseAdmin
      .from('accounts')
      .select('id, user_id, name, state')
      .eq('status', 'active')

    if (accErr || !accounts?.length) {
      return NextResponse.json({ message: 'No active accounts', error: accErr?.message }, { status: 200 })
    }

    let totalUpdates = 0

    // Process in batches to stay under time limit
    for (const account of accounts) {
      try {
        // Build search query — org name + state for specificity
        const query = account.state
          ? `"${account.name}" ${account.state} news`
          : `"${account.name}" news`

        const results = await searchBrave(query)
        if (!results.length) continue

        // Check existing URLs to avoid duplicates
        const { data: existing } = await supabaseAdmin
          .from('account_updates')
          .select('source_url')
          .eq('account_id', account.id)
          .not('source_url', 'is', null)

        const existingUrls = new Set((existing || []).map(e => e.source_url))

        const newUpdates = results
          .filter(r => r.url && !existingUrls.has(r.url))
          .filter(r => {
            // Basic relevance: title or snippet should mention the org name
            const name = account.name.toLowerCase()
            const nameWords = name.split(/\s+/).filter((w: string) => w.length > 3)
            const text = `${r.title} ${r.description}`.toLowerCase()
            return nameWords.some((w: string) => text.includes(w))
          })
          .slice(0, 5)
          .map(r => ({
            account_id: account.id,
            user_id: account.user_id,
            type: classifyType(r.title, r.description),
            title: r.title,
            summary: r.description,
            source_url: r.url,
          }))

        if (newUpdates.length) {
          await supabaseAdmin.from('account_updates').insert(newUpdates)
          totalUpdates += newUpdates.length
        }
      } catch {
        // Skip individual account errors, continue processing
      }
    }

    return NextResponse.json({ message: `Processed ${accounts.length} accounts, ${totalUpdates} new updates` })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
