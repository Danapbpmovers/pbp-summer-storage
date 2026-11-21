import { NextResponse } from 'next/server'
import { payments, siteUrl } from '@/config/site'
import { orderAccess } from '@/lib/access'
import { checkoutFlow, checkoutMethods, stripe } from '@/lib/stripe'
import { adminClient } from '@/lib/supabase/server'

// Starts Stripe Checkout for an open charge. The amount follows dual pricing:
// listed (card) price, or the ACH discount price for bank transfer.
export async function POST(req: Request) {
  const db = adminClient()
  if (!db || !stripe) return NextResponse.json({ error: 'Online payment isn’t connected yet. Please call or email us.' }, { status: 503 })
  const { chargeId, method: m } = await req.json().catch(() => ({}))
  const method = m === 'card' ? 'card' : 'ach'
  const { data: ch } = await db.from('charges').select('*').eq('id', String(chargeId)).maybeSingle()
  if (!ch || !['open', 'failed'].includes(ch.status)) return NextResponse.json({ error: 'That charge can’t be paid online.' }, { status: 400 })
  const access = await orderAccess(ch.order_id)
  if (!access?.canPay) return NextResponse.json({ error: 'You don’t have permission to pay for this order.' }, { status: 403 })

  const actual = ch.amount_cents - (ch.card_fee_cents ?? 0)
  // Keep the exact quoted card amount if the customer already chose card; otherwise list it.
  const card = ch.payment_method === 'card' ? ch.amount_cents : Math.round(actual * (1 + payments.cardFeePercent / 100))
  const amount = method === 'card' ? card : actual
  await db.from('charges').update({ amount_cents: amount, card_fee_cents: method === 'card' ? card - actual : 0, payment_method: method }).eq('id', ch.id)

  const { data: prof } = await db.from('profiles').select('stripe_customer_id').eq('id', ch.customer_id).single()
  let customer = prof?.stripe_customer_id as string | null
  if (!customer) {
    const c = await stripe.customers.create({ email: access.email, metadata: { profile_id: ch.customer_id } }, { idempotencyKey: `customer-pay-${ch.customer_id}` })
    customer = c.id
    await db.from('profiles').update({ stripe_customer_id: customer }).eq('id', ch.customer_id)
  }
  const back = `${siteUrl}/app/orders/${ch.order_id}`
  const session = await stripe.checkout.sessions.create({
    mode: 'payment', customer, ...checkoutMethods(method), integration_identifier: checkoutFlow.payLink,
    line_items: [{ quantity: 1, price_data: { currency: 'usd', unit_amount: amount, product_data: { name: ch.description } } }],
    payment_intent_data: { setup_future_usage: 'off_session', metadata: { order_id: ch.order_id, charge_id: ch.id } },
    metadata: { order_id: ch.order_id, charge_id: ch.id },
    success_url: `${back}?paid=1`, cancel_url: `${back}?cancelled=1`,
  }, { idempotencyKey: `pay-${ch.id}-${method}-${amount}-${Math.floor(Date.now() / 60000)}` })
  await db.from('charges').update({ stripe_checkout_session_id: session.id }).eq('id', ch.id)
  return NextResponse.json({ url: session.url })
}
