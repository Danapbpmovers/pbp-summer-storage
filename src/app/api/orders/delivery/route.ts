import { NextResponse } from 'next/server'
import { orderAccess } from '@/lib/access'
import { getCampusData } from '@/lib/campus'
import { todayIso, addDays } from '@/lib/format'
import { sendEmail } from '@/lib/notify'
import { adminClient } from '@/lib/supabase/server'

// Fall delivery request. Applies the posted fee rules and the request deadline.
export async function POST(req: Request) {
  const db = adminClient()
  if (!db) return NextResponse.json({ error: 'Not connected.' }, { status: 503 })
  const b = await req.json().catch(() => ({}))
  const access = await orderAccess(String(b.orderId))
  if (!access?.canSchedule) return NextResponse.json({ error: 'You don’t have permission to schedule this order.' }, { status: 403 })
  const method = ['on_campus', 'off_campus', 'ship'].includes(b.method) ? b.method : 'on_campus'
  const date = typeof b.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(b.date) ? b.date : null
  if (!date) return NextResponse.json({ error: 'Choose a date.' }, { status: 400 })
  const hall = String(b.hall ?? '').slice(0, 120), address = String(b.address ?? '').slice(0, 300), win = String(b.window ?? '').slice(0, 60)
  if (method === 'on_campus' ? !hall : !address) return NextResponse.json({ error: method === 'on_campus' ? 'Enter your residence hall.' : 'Enter the address.' }, { status: 400 })

  const { data: campus } = await db.from('campuses').select('slug, timezone').eq('id', access.order.campus_id).single()
  const data = await getCampusData(campus!.slug)
  if (!data) return NextResponse.json({ error: 'Campus not found.' }, { status: 400 })
  const today = todayIso(campus!.timezone)
  const fallWin = data.calendar.find((c) => c.key === 'fall_delivery_window')
  const peakIn = data.calendar.find((c) => c.key === 'peak_move_in')
  const inFall = fallWin && date >= fallWin.starts_on && date <= (fallWin.ends_on ?? fallWin.starts_on)
  if (!inFall && date < addDays(today, 3)) return NextResponse.json({ error: 'Deliveries outside move-in need 72 hours’ notice.' }, { status: 400 })

  // Fees
  const fee = (code: string) => data.fees.find((f) => f.code === code)
  const charges: { description: string; amount_cents: number; fee_code: string }[] = []
  const deadline = data.calendar.find((c) => c.key === (method === 'off_campus' ? 'offcampus_request_deadline' : 'delivery_request_deadline'))
  if (inFall && deadline && today > deadline.starts_on && fee('late_scheduling')) charges.push({ description: 'Late scheduling fee', amount_cents: fee('late_scheduling')!.amount_cents, fee_code: 'late_scheduling' })
  const isPeak = peakIn && date >= peakIn.starts_on && date <= (peakIn.ends_on ?? peakIn.starts_on)
  const dow = new Date(`${date}T12:00:00`).getDay()
  if (method === 'off_campus' && isPeak && fee('offcampus_delivery')) charges.push({ description: 'Off-campus delivery', amount_cents: fee('offcampus_delivery')!.amount_cents, fee_code: 'offcampus_delivery' })
  else if (method !== 'ship' && !isPeak) {
    const code = dow === 0 ? 'delivery_sunday' : dow === 6 ? 'delivery_saturday' : 'delivery_weekday'
    if (fee(code)) charges.push({ description: fee(code)!.name, amount_cents: fee(code)!.amount_cents, fee_code: code })
  }
  if (win.startsWith('5pm') && fee('delivery_evening')) charges.push({ description: 'Evening delivery', amount_cents: fee('delivery_evening')!.amount_cents, fee_code: 'delivery_evening' })

  await db.from('appointments').insert({ order_id: access.order.id, kind: 'delivery', date, window_label: win, hall: method === 'on_campus' ? hall : null, address: method === 'on_campus' ? null : address, status: 'requested' })
  await db.from('orders').update({ status: 'delivery_requested', return_method: method, return_hall: hall || null, return_address: address || null, updated_at: new Date().toISOString() }).eq('id', access.order.id)
  if (charges.length) await db.from('charges').insert(charges.map((c) => ({ ...c, order_id: access.order.id, customer_id: access.order.customer_id, status: 'open', payment_method: 'ach' })))
  await sendEmail(db, { customerId: access.order.customer_id, orderId: access.order.id, template: 'delivery_requested', to: access.email, subject: `Delivery requested – order #${access.order.order_number}`, body: `We’ve received your delivery request for ${date} (${win}). We’ll confirm the details by email.` })
  return NextResponse.json({ ok: true })
}
