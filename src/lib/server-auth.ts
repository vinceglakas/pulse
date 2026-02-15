import { createClient } from '@supabase/supabase-js'

const ULTRON_API_SECRET = process.env.ULTRON_API_SECRET || ''

/**
 * Authenticate a request. Supports two paths:
 * 1. Browser auth: Authorization: Bearer <supabase-jwt>
 * 2. Agent auth: X-Ultron-Secret header + X-User-Id header or userId in body/query
 */
export async function getUserFromRequest(req: Request): Promise<{ id: string } | null> {
  // Path 1: Agent auth via Ultron secret
  const ultronSecret = req.headers.get('x-ultron-secret')
  if (ultronSecret && ULTRON_API_SECRET && ultronSecret === ULTRON_API_SECRET) {
    const userId = req.headers.get('x-user-id')
    if (userId) return { id: userId }
    // Also check query params for GET requests
    try {
      const url = new URL(req.url)
      const qUserId = url.searchParams.get('userId')
      if (qUserId) return { id: qUserId }
    } catch {}
    // For POST/PUT, try to peek at body (clone to preserve stream)
    // Note: we can't easily peek body here without consuming it, 
    // so userId should be in header or query param for agent auth
    return null
  }

  // Path 2: Browser auth via Supabase JWT
  const authHeader = req.headers.get('authorization')
  if (!authHeader) return null
  try {
    const userSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { global: { headers: { Authorization: authHeader } } }
    )
    const { data: { user } } = await userSupabase.auth.getUser()
    return user ? { id: user.id } : null
  } catch { return null }
}
