import { NextResponse } from 'next/server'
import { contact } from '@/config/site'
import { orderAccess } from '@/lib/access'
import { money } from '@/lib/format'
import { sendEmail } from '@/lib/notify'
import { adminClient } from '@/lib/supabase/server'

// Customer files a claim. Enforces the campus claim window from the delivery date.
export async function POST(req: Request) {
  const db = adminClient()
  if (!db) return NextResponse.json({ error: 'Not connected.' }, { status: 503 })
  const b = await req.json().catch(() => ({}))
  const access = await orderAccess(String(b.orderId ?? ''))
  if (!access) return NextResponse.json({ error: 'Order not found.' }, { status: 404 })

  const { data: order } = await db.from('orders').select('id, order_number, customer_id, campus_id, status, delivered_at').eq('id', access.order.id).single()
  if (!order || !['out_for_delivery', 'completed'].includes(order.status)) return NextResponse.json({ error: 'Claims can be filed once your items are delivered.' }, { status: 400 })
  const { data: plan } = await db.from('insurance_plans').select('claim_window_days').eq('campus_id', order.campus_id).maybeSingle()
  const days = plan?.claim_window_days ?? 3
  if (order.delivered_at && Date.now() > new Date(order.delivered_at).getTime() + days * 86400000) {
    return NextResponse.json({ error: `Claims must be filed within ${days} days of delivery. Please email ${contact.email}.` }, { status: 400 })
  }

  const description = String(b.description ?? '').trim().slice(0, 4000)
  if (description.length < 10) return NextResponse.json({ error: 'Please describe what happened.' }, { status: 400 })
  const kind = b.kind === 'missing' ? 'missing' : 'damaged'
  const amount = Math.round(parseFloat(String(b.amount ?? '').replace(/[$,]/g, '')) * 100)
  const photos = (Array.isArray(b.photos) ? b.photos : []).filter((p: unknown) => typeof p === 'string' && p.startsWith(`${order.id}/claims/`)).slice(0, 6)
  let itemId: string | null = null
  if (b.itemId) {
    const { data: it } = await db.from('order_items').select('id').eq('id', String(b.itemId)).eq('order_id', order.id).maybeSingle()
    itemId = it?.id ?? null
  }

  const { data: claim, error } = await db.from('claims').insert({
    order_id: order.id, customer_id: order.customer_id, filed_by: access.userId, order_item_id: itemId,
    kind, description, amount_claimed_cents: Number.isFinite(amount) && amount > 0 ? amount : null, photos,
  }).select('id').single()
  if (error || !claim) return NextResponse.json({ error: 'Couldn’t file the claim.' }, { status: 500 })

  await sendEmail(db, { customerId: order.customer_id, orderId: order.id, template: 'claim_received', to: access.email, subject: `Claim received – order #${order.order_number}`, body: `We’ve received your claim${Number.isFinite(amount) && amount > 0 ? ` for ${money(amount)}` : ''} and will review it within a few business days. Please keep the item, box and packing materials until it’s resolved.` })
  await sendEmail(db, { orderId: order.id, template: 'claim_staff_alert', to: contact.email, subject: `New claim on order #${order.order_number}`, body: `${kind} claim: ${description.slice(0, 500)}` })
  return NextResponse.json({ ok: true })
}
