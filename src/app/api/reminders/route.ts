import { NextResponse } from 'next/server'
import { adminClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}))
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase().slice(0, 200) : ''
  if (!/^\S+@\S+\.\S+$/.test(email)) return NextResponse.json({ error: 'Enter a valid email.' }, { status: 400 })
  const db = adminClient()
  if (!db) return NextResponse.json({ error: 'Reminders aren’t connected yet. Please email us.' }, { status: 503 })
  await db.from('reminder_signups').insert({ email, campus_slug: typeof body.campus === 'string' ? body.campus.slice(0, 80) : null })
  return NextResponse.json({ ok: true })
}
