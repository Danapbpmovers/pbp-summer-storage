import { NextResponse } from 'next/server'
import { serverClient } from '@/lib/supabase/server'

// Email confirmation and password-reset links land here. If the sign-in handoff can't
// complete (e.g. the link was opened on another device), the email is still confirmed,
// so send them to log in with a confirmation message.
export async function GET(req: Request) {
  const url = new URL(req.url)
  const code = url.searchParams.get('code')
  const nextParam = url.searchParams.get('next') ?? '/app'
  const next = nextParam.startsWith('/') && !nextParam.startsWith('//') ? nextParam : '/app'
  const sb = await serverClient()
  if (sb && code) {
    const { error } = await sb.auth.exchangeCodeForSession(code)
    if (!error) return NextResponse.redirect(new URL(next, url.origin))
  }
  return NextResponse.redirect(new URL(`/login?confirmed=1&next=${encodeURIComponent(next)}`, url.origin))
}
