import { NextResponse } from 'next/server'
import { getCampusData } from '@/lib/campus'
import { findPromo } from '@/lib/promo'
import { adminClient } from '@/lib/supabase/server'

export async function GET(req: Request) {
  const url = new URL(req.url)
  const code = (url.searchParams.get('code') ?? '').trim().slice(0, 40)
  const db = adminClient()
  const data = await getCampusData(url.searchParams.get('campus') ?? '')
  if (!db || !data || !code) return NextResponse.json({ error: 'That promo code isn’t valid.' }, { status: 400 })
  const r = await findPromo(db, code, data.campus.id)
  return r.ok ? NextResponse.json({ promo: r.promo }) : NextResponse.json({ error: r.error }, { status: 400 })
}
