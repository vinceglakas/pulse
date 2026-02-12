import { createClient } from '@supabase/supabase-js'

// Browser-side auth client (uses anon key)
export function getAuthClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}

export async function signInWithGoogle() {
  const supabase = getAuthClient()
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
    },
  })
  return { data, error }
}

export async function signInWithEmail(email: string, password: string) {
  const supabase = getAuthClient()
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  return { data, error }
}

export async function signUpWithEmail(email: string, password: string, fullName: string) {
  const supabase = getAuthClient()
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName },
    },
  })
  return { data, error }
}

export async function signOut() {
  const supabase = getAuthClient()
  await supabase.auth.signOut()
}

export async function getSession() {
  const supabase = getAuthClient()
  const { data: { session } } = await supabase.auth.getSession()
  return session
}

export async function getAccessToken() {
  const supabase = getAuthClient()
  const { data: { session } } = await supabase.auth.getSession()
  return session?.access_token || null
}

export async function getUser() {
  const supabase = getAuthClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}
