import 'server-only'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { SUPABASE_ANON_KEY, SUPABASE_URL, isSupabaseConfigured } from './env'

/** Supabase client acting as the signed-in user (RLS applies). */
export async function serverClient() {
  if (!isSupabaseConfigured) return null
  const store = await cookies()
  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        try {
          list.forEach(({ name, value, options }) => store.set(name, value, options))
        } catch {
          // Called from a Server Component; the middleware refreshes the session instead.
        }
      },
    },
  })
}

/** Service-role client. Server only; bypasses RLS — use for pricing, capacity and webhooks. */
export function adminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!isSupabaseConfigured || !key) return null
  return createClient(SUPABASE_URL, key, { auth: { persistSession: false } })
}

export interface SessionInfo {
  userId: string
  email: string
  profile: {
    id: string
    email: string
    first_name: string
    last_name: string
    phone: string
    role: 'customer' | 'crew' | 'campus_manager' | 'finance' | 'admin'
    campus_id: string | null
    account_type: 'student' | 'parent'
    stripe_customer_id: string | null
    sms_consent: boolean
    marketing_consent: boolean
    student_id: string | null
    class_year: string | null
  } | null
}

export async function getSession(): Promise<SessionInfo | null> {
  const sb = await serverClient()
  if (!sb) return null
  const { data } = await sb.auth.getUser()
  if (!data.user) return null
  const { data: profile } = await sb.from('profiles').select('*').eq('id', data.user.id).maybeSingle()
  return { userId: data.user.id, email: data.user.email ?? '', profile }
}

export const isStaffRole = (r?: string | null) => !!r && r !== 'customer'
export const isManagerRole = (r?: string | null) => r === 'admin' || r === 'campus_manager'
