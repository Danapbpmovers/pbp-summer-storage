'use client'
import { createBrowserClient } from '@supabase/ssr'
import { SUPABASE_ANON_KEY, SUPABASE_URL, isSupabaseConfigured } from './env'

let client: ReturnType<typeof createBrowserClient> | null = null

export function browserClient() {
  if (!isSupabaseConfigured) return null
  client ??= createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  return client
}
