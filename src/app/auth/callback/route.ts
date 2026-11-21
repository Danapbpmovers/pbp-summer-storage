import { NextResponse } from 'next/server'
import { serverClient } from '@/lib/supabase/server'

// Email confirmation and password-reset links land here.
export async function GET(req: Request) {
  const url = new URL(req.url)
  const code = url.searchParams.get('code')
  const next = url.searchParams.get('next') ?? '/app'
  const sb = await serverClient()
  if (sb && code) await sb.auth.exchangeCodeForSession(code)
  return NextResponse.redirect(new URL(next.startsWith('/') ? next : '/app', url.origin))
}
