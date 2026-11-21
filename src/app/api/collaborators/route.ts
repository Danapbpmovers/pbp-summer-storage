import { NextResponse } from 'next/server'
import { siteUrl } from '@/config/site'
import { sendEmail } from '@/lib/notify'
import { adminClient, getSession, serverClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  const [sb, session, db] = await Promise.all([serverClient(), getSession(), adminClient()])
  if (!sb || !session || !db) return NextResponse.json({ error: 'Please log in.' }, { status: 401 })
  const b = await req.json().catch(() => ({}))
  const email = String(b.email ?? '').trim().toLowerCase().slice(0, 200)
  if (!/^\S+@\S+\.\S+$/.test(email) || email === session.email.toLowerCase()) return NextResponse.json({ error: 'Enter someone else’s email.' }, { status: 400 })
  const { error } = await sb.from('collaborators').insert({ owner_id: session.userId, email, can_pay: !!b.can_pay, can_schedule: !!b.can_schedule })
  if (error) return NextResponse.json({ error: error.code === '23505' ? 'Already invited.' : 'Couldn’t invite.' }, { status: 400 })
  await sendEmail(db, { customerId: session.userId, template: 'collaborator_invite', to: email, subject: `${session.profile?.first_name ?? 'Someone'} shared their storage account with you`, body: `You’ve been added to a PackStoreShip storage account. Log in or create an account with this email to see items, photos and invoices: ${siteUrl}/login` })
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: Request) {
  const sb = await serverClient()
  const id = new URL(req.url).searchParams.get('id')
  if (!sb || !id) return NextResponse.json({ error: 'Bad request' }, { status: 400 })
  await sb.from('collaborators').delete().eq('id', id)
  return NextResponse.json({ ok: true })
}
