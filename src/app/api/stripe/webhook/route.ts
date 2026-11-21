import { NextResponse } from 'next/server'
import type Stripe from 'stripe'
import { siteUrl } from '@/config/site'
import { money } from '@/lib/format'
import { sendEmail, sendSms } from '@/lib/notify'
import { stripe } from '@/lib/stripe'
import { adminClient } from '@/lib/supabase/server'

// Stripe → /api/stripe/webhook. Subscribe to:
// checkout.session.completed, checkout.session.async_payment_succeeded,
// checkout.session.async_payment_failed, payment_intent.succeeded,
// payment_intent.payment_failed, charge.refunded, charge.dispute.created
export async function POST(req: Request) {
  const db = adminClient()
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  if (!stripe || !db || !secret) return NextResponse.json({ error: 'not configured' }, { status: 503 })

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(await req.text(), req.headers.get('stripe-signature') ?? '', secret)
  } catch {
    return NextResponse.json({ error: 'bad signature' }, { status: 400 })
  }

  const markPaid = async (chargeId: string, paymentIntent: string | null) => {
    const { data: ch } = await db.from('charges').update({ status: 'paid', paid_at: new Date().toISOString(), stripe_payment_intent_id: paymentIntent })
      .eq('id', chargeId).neq('status', 'paid').select('id, order_id, customer_id, amount_cents, description').maybeSingle()
    if (!ch) return // already processed (webhooks can repeat)
    const { data: order } = await db.from('orders').select('id, order_number, status, paid_cents').eq('id', ch.order_id).single()
    if (!order) return
    await db.from('orders').update({
      paid_cents: (order.paid_cents ?? 0) + ch.amount_cents,
      status: order.status === 'pending_payment' || order.status === 'reserved' ? 'confirmed' : order.status,
      updated_at: new Date().toISOString(),
    }).eq('id', order.id)
    const { data: p } = await db.from('profiles').select('email, phone, sms_consent').eq('id', ch.customer_id).single()
    if (p) {
      await sendEmail(db, { customerId: ch.customer_id, orderId: order.id, template: 'payment_receipt', to: p.email, subject: `Receipt: ${ch.description}`, body: `Payment received: ${money(ch.amount_cents)} for ${ch.description}.\n\nPrint your labels and see your order: ${siteUrl}/app/orders/${order.id}` })
      await sendSms(db, { customerId: ch.customer_id, orderId: order.id, template: 'payment_receipt', to: p.phone, consent: p.sms_consent, body: `PackStoreShip: payment received for order #${order.order_number}. Print your labels at ${siteUrl}/app` })
    }
  }

  switch (event.type) {
    case 'checkout.session.completed':
    case 'checkout.session.async_payment_succeeded': {
      const s = event.data.object as Stripe.Checkout.Session
      const chargeId = s.metadata?.charge_id
      if (!chargeId) break
      const pi = typeof s.payment_intent === 'string' ? s.payment_intent : s.payment_intent?.id ?? null
      if (s.payment_status === 'paid') await markPaid(chargeId, pi)
      else await db.from('charges').update({ status: 'processing', stripe_payment_intent_id: pi }).eq('id', chargeId) // ACH clearing
      break
    }
    case 'checkout.session.async_payment_failed': {
      const s = event.data.object as Stripe.Checkout.Session
      if (s.metadata?.charge_id) await db.from('charges').update({ status: 'failed' }).eq('id', s.metadata.charge_id)
      break
    }
    // Off-session charges created by staff (overages, fees) use PaymentIntents directly.
    case 'payment_intent.succeeded': {
      const pi = event.data.object as Stripe.PaymentIntent
      if (pi.metadata?.charge_id && pi.metadata?.source === 'staff') await markPaid(pi.metadata.charge_id, pi.id)
      break
    }
    case 'payment_intent.payment_failed': {
      const pi = event.data.object as Stripe.PaymentIntent
      if (pi.metadata?.charge_id) await db.from('charges').update({ status: 'failed' }).eq('id', pi.metadata.charge_id)
      break
    }
    case 'charge.refunded': {
      const c = event.data.object as Stripe.Charge
      const pi = typeof c.payment_intent === 'string' ? c.payment_intent : c.payment_intent?.id
      if (pi) await db.from('charges').update({ refunded_cents: c.amount_refunded, status: c.refunded ? 'refunded' : 'paid' }).eq('stripe_payment_intent_id', pi)
      break
    }
    case 'charge.dispute.created': {
      const d = event.data.object as Stripe.Dispute
      await db.from('audit_events').insert({ action: 'stripe_dispute', entity: 'charge', entity_id: typeof d.payment_intent === 'string' ? d.payment_intent : null, detail: { amount: d.amount, reason: d.reason } })
      break
    }
  }
  return NextResponse.json({ received: true })
}
