import { NextResponse } from 'next/server'
import { payments, siteUrl } from '@/config/site'
import { orderAccess } from '@/lib/access'
import { getCampusData } from '@/lib/campus'
import { money } from '@/lib/format'
import { newLabelCode } from '@/lib/labels'
import { ADDABLE_STATUSES } from '@/lib/orders'
import { sendEmail } from '@/lib/notify'
import { applyPaymentMethod, quote } from '@/lib/pricing'
import { checkoutMethods, stripe } from '@/lib/stripe'
import { adminClient } from '@/lib/supabase/server'

// Adds items to an existing order and takes payment for just those items, up front.

const bad = (error: string, status = 400) => NextResponse.json({ error }, { status })

export async function POST(req: Request) {
  const db = adminClient()
  if (!db) return bad('Not connected.', 503)
  const b = await req.json().catch(() => ({}))
  const access = await orderAccess(String(b.orderId ?? ''))
  if (!access) return bad('Order not found.', 404)
  if (!access.canPay) return bad('You don’t have permission to add to this order.', 403)

  const { data: order } = await db.from('orders').select('id, order_number, customer_id, campus_id, service, status, quoted_cents').eq('id', access.order.id).single()
  if (!order || !ADDABLE_STATUSES.includes(order.status)) return bad('Items can’t be added to this order anymore. Please start a new booking or contact us.')
  const { data: campus } = await db.from('campuses').select('slug').eq('id', order.campus_id).single()
  const data = await getCampusData(campus!.slug)
  if (!data) return bad('Campus not found.')

  const method = b.method === 'card' ? 'card' : 'ach'
  // Items only: no coverage add-on and no pickup/delivery fees on an add-on.
  const q = quote(data, {
    service: order.service, items: b.items ?? {}, ship_ahead_count: Number(b.ship_ahead_count) || 0, ship_ahead_oversize: Number(b.ship_ahead_oversize) || 0,
    declared_value_cents: data.insurance.included_cents, dropoff_method: 'undecided', dropoff_date: null, return_method: 'undecided',
  })
  const pay = applyPaymentMethod(q, method, payments)
  const added = q.lines.filter((l) => l.kind === 'item' || l.kind === 'ship_ahead' || l.kind === 'supply')
  if (!added.length || pay.total_cents <= 0) return bad('Add at least one item.')

  // New labels for each new physical item (supplies don't get labels).
  const rows: object[] = []
  for (const l of q.lines) {
    if (l.kind !== 'item' && l.kind !== 'ship_ahead') continue
    const cat = data.catalog.find((c) => c.id === l.ref)
    for (let i = 0; i < l.qty; i++) rows.push({ order_id: order.id, catalog_item_id: cat?.id ?? null, name: l.label, category: cat?.category ?? 'ship_ahead', unit_price_cents: l.unit_cents, label_code: newLabelCode() })
  }
  if (rows.length) await db.from('order_items').insert(rows)
  await db.from('orders').update({ quoted_cents: (order.quoted_cents ?? 0) + pay.total_cents, updated_at: new Date().toISOString() }).eq('id', order.id)

  const description = `Order #${order.order_number} – added ${added.map((l) => `${l.label}${l.qty > 1 ? ` × ${l.qty}` : ''}`).join(', ')}`.slice(0, 200)
  const { data: charge } = await db.from('charges').insert({
    order_id: order.id, customer_id: order.customer_id, description, amount_cents: pay.total_cents, payment_method: method,
    card_fee_cents: method === 'card' ? pay.ach_discount_cents : 0, status: 'open', created_by: access.userId,
  }).select('id').single()

  const back = `${siteUrl}/app/orders/${order.id}`
  if (!stripe) {
    await sendEmail(db, { customerId: order.customer_id, orderId: order.id, template: 'items_added', to: access.email, subject: `Items added to order #${order.order_number}`, body: `${description}.\n\nTotal ${money(pay.total_cents)}${method === 'ach' ? ` (ACH discount of ${money(pay.ach_discount_cents)} applied)` : ''}. We’ll send a payment link shortly. Print labels for the new items in your account.` })
    return NextResponse.json({ redirect: `${back}?added=1&pending=1` })
  }

  const { data: prof } = await db.from('profiles').select('stripe_customer_id').eq('id', order.customer_id).single()
  let customer = prof?.stripe_customer_id as string | null
  if (!customer) {
    const c = await stripe.customers.create({ email: access.email, metadata: { profile_id: order.customer_id } }, { idempotencyKey: `customer-add-${order.customer_id}` })
    customer = c.id
    await db.from('profiles').update({ stripe_customer_id: customer }).eq('id', order.customer_id)
  }
  const checkout = await stripe.checkout.sessions.create({
    mode: 'payment', customer, ...checkoutMethods(method),
    line_items: [{ quantity: 1, price_data: { currency: 'usd', unit_amount: pay.total_cents, product_data: { name: description, description: method === 'ach' ? 'ACH discount applied' : 'Card' } } }],
    payment_intent_data: { setup_future_usage: 'off_session', metadata: { order_id: order.id, charge_id: charge?.id ?? '' } },
    metadata: { order_id: order.id, charge_id: charge?.id ?? '' },
    success_url: `${back}?added=1&paid=1`, cancel_url: `${back}?cancelled=1`,
  }, { idempotencyKey: `checkout-${charge?.id}` })
  await db.from('charges').update({ stripe_checkout_session_id: checkout.id }).eq('id', charge?.id)
  return NextResponse.json({ redirect: checkout.url })
}
