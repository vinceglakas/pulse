import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { encrypt, decrypt, maskKey } from '@/lib/encryption'

const PROVIDERS: Record<string, { name: string; testUrl: string }> = {
  anthropic: { name: 'Anthropic', testUrl: 'https://api.anthropic.com/v1/models' },
  openai: { name: 'OpenAI', testUrl: 'https://api.openai.com/v1/models' },
  google: { name: 'Google', testUrl: 'https://generativelanguage.googleapis.com/v1/models' },
  moonshot: { name: 'Moonshot/Kimi', testUrl: 'https://api.moonshot.cn/v1/models' },
  custom: { name: 'Custom', testUrl: '' },
}

async function getAuthUser(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (!authHeader) return null
  const userSupabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: authHeader } } }
  )
  const { data: { user } } = await userSupabase.auth.getUser()
  return user
}

export async function GET(request: NextRequest) {
  const user = await getAuthUser(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('api_keys')
    .select('id, provider, key_hint, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: 'Failed to fetch keys' }, { status: 500 })

  return NextResponse.json({ keys: data })
}

export async function POST(request: NextRequest) {
  const user = await getAuthUser(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: { provider: string; apiKey: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const { provider, apiKey } = body
  if (!provider || !apiKey) {
    return NextResponse.json({ error: 'Provider and API key are required' }, { status: 400 })
  }

  const providerConfig = PROVIDERS[provider]
  if (!providerConfig) {
    return NextResponse.json({ error: 'Invalid provider' }, { status: 400 })
  }

  // Test the key against the provider's API
  if (provider !== 'custom') {
    try {
      const headers: Record<string, string> = {}
      let testUrl = providerConfig.testUrl

      if (provider === 'anthropic') {
        headers['x-api-key'] = apiKey
        headers['anthropic-version'] = '2023-06-01'
      } else if (provider === 'google') {
        testUrl = `${providerConfig.testUrl}?key=${apiKey}`
      } else {
        headers['Authorization'] = `Bearer ${apiKey}`
      }

      const res = await fetch(testUrl, { headers, signal: AbortSignal.timeout(10000) })
      if (!res.ok) {
        return NextResponse.json(
          { error: `API key validation failed (${res.status}). Please check your key.` },
          { status: 400 }
        )
      }
    } catch (e: any) {
      return NextResponse.json(
        { error: `Could not validate key: ${e.message || 'connection failed'}` },
        { status: 400 }
      )
    }
  }

  const encryptedKey = encrypt(apiKey)
  const keyHint = maskKey(apiKey)

  const { data, error } = await supabase
    .from('api_keys')
    .insert({
      user_id: user.id,
      provider,
      encrypted_key: encryptedKey,
      key_hint: keyHint,
    })
    .select('id, provider, key_hint, created_at')
    .single()

  if (error) {
    return NextResponse.json({ error: 'Failed to save key' }, { status: 500 })
  }

  return NextResponse.json({ key: data }, { status: 201 })
}
