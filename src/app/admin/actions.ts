'use server'
import { revalidatePath } from 'next/cache'
import { payments } from '@/config/site'
import { getSession, isManagerRole, isStaffRole, serverClient, adminClient } from '@/lib/supabase/server'
import { stripe } from '@/lib/stripe'
import { sendEmail } from '@/lib/notify'
import { money } from '@/lib/format'
import { receive } from '@/lib/intake'

async function staff(manager = false) {
  const [sb, session] = await Promise.all([serverClient(), getSession()])
  const role = session?.profile?.role
  if (!sb || !session || !(manager ? isManagerRole(role) : isStaffRole(role))) throw new Error('Not allowed')
  return { sb, session }
}

const cents = (v: FormDataEntryValue | null) => Math.round(parseFloat(String(v ?? '').replace(/[$,]/g, '')) * 100)

async function audit(actor: string, action: string, entity: string, entityId: string, detail: object) {
  await adminClient()?.from('audit_events').insert({ actor_id: actor, action, entity, entity_id: entityId, detail })
}

// ---------------------------------------------------------------- catalog & fees
export async function savePrice(fd: FormData) {
  const { sb, session } = await staff(true)
  const id = String(fd.get('id')), table = fd.get('table') === 'fee' ? 'fee_rules' : 'catalog_items'
  const price = cents(fd.get('price'))
  if (!Number.isFinite(price) || price < 0) throw new Error('Bad price')
  const patch = table === 'catalog_items'
    ? { price_cents: price, name: String(fd.get('name')).slice(0, 120), active: fd.get('active') === 'on', updated_at: new Date().toISOString() }
    : { amount_cents: price, name: String(fd.get('name')).slice(0, 120), active: fd.get('active') === 'on' }
  await sb.from(table).update(patch).eq('id', id)
  await audit(session.userId, 'price_change', table, id, patch)
  revalidatePath('/', 'layout')
}

export async function addCatalogItem(fd: FormData) {
  const { sb, session } = await staff(true)
  const row = { campus_id: String(fd.get('campus_id')), category: String(fd.get('category')), name: String(fd.get('name')).slice(0, 120), price_cents: cents(fd.get('price')), sort: 1000 }
  if (!row.name || !Number.isFinite(row.price_cents)) throw new Error('Name and price required')
  await sb.from('catalog_items').insert(row)
  await audit(session.userId, 'catalog_add', 'catalog_items', row.name, row)
  revalidatePath('/', 'layout')
}

// ---------------------------------------------------------------- dates & capacity
export async function saveDate(fd: FormData) {
  const { sb, session } = await staff(true)
  const id = String(fd.get('id'))
  const patch = { starts_on: String(fd.get('starts_on')), ends_on: String(fd.get('ends_on') || '') || null, confirmed: fd.get('confirmed') === 'on' }
  await sb.from('calendar_windows').update(patch).eq('id', id)
  await audit(session.userId, 'date_change', 'calendar_windows', id, patch)
  revalidatePath('/', 'layout')
}

export async function saveSlot(fd: FormData) {
  const { sb } = await staff(true)
  await sb.from('slots').update({ capacity: Math.max(0, parseInt(String(fd.get('capacity')), 10) || 0), window_label: String(fd.get('window_label')).slice(0, 60) }).eq('id', String(fd.get('id')))
  revalidatePath('/admin/calendar')
}

// ---------------------------------------------------------------- orders
export async function updateOrder(fd: FormData) {
  const { sb, session } = await staff()
  const id = String(fd.get('id'))
  const patch = { status: String(fd.get('status')), delivery_hold: fd.get('delivery_hold') === 'on', notes: String(fd.get('notes') ?? '').slice(0, 4000), updated_at: new Date().toISOString() }
  await sb.from('orders').update(patch).eq('id', id)
  await audit(session.userId, 'order_update', 'orders', id, patch)
  revalidatePath(`/admin/orders/${id}`)
}

/** Adds a fee or adjustment. If "charge now" is ticked and a saved payment method exists, charges it off-session. */
export async function addCharge(fd: FormData) {
  const { sb, session } = await staff()
  const db = adminClient()!
  const orderId = String(fd.get('order_id'))
  const { data: order } = await sb.from('orders').select('id, order_number, customer_id').eq('id', orderId).single()
  if (!order) throw new Error('Order not found')
  const actual = cents(fd.get('amount'))
  if (!Number.isFinite(actual) || actual <= 0) throw new Error('Amount required')
  const description = String(fd.get('description')).slice(0, 200) || 'Additional charge'
  const { data: charge } = await db.from('charges').insert({ order_id: orderId, customer_id: order.customer_id, description, amount_cents: actual, fee_code: String(fd.get('fee_code') || '') || null, status: 'open', payment_method: 'ach', created_by: session.userId }).select('id').single()
  await audit(session.userId, 'charge_add', 'charges', charge!.id, { orderId, actual, description })

  const { data: prof } = await db.from('profiles').select('email, stripe_customer_id').eq('id', order.customer_id).single()
  if (fd.get('charge_now') === 'on' && stripe && prof?.stripe_customer_id) {
    // Use the most recent saved payment method; apply dual pricing for cards.
    const pms = await stripe.paymentMethods.list({ customer: prof.stripe_customer_id, limit: 1 })
    const pm = pms.data[0]
    if (pm) {
      const isCard = pm.type === 'card'
      const amount = isCard ? Math.round(actual * (1 + payments.cardFeePercent / 100)) : actual
      await db.from('charges').update({ amount_cents: amount, card_fee_cents: amount - actual, payment_method: isCard ? 'card' : 'ach', status: 'processing' }).eq('id', charge!.id)
      try {
        const pi = await stripe.paymentIntents.create({
          amount, currency: 'usd', customer: prof.stripe_customer_id, payment_method: pm.id, off_session: true, confirm: true,
          description: `Order #${order.order_number}: ${description}`, metadata: { order_id: orderId, charge_id: charge!.id, source: 'staff' },
        }, { idempotencyKey: `staff-charge-${charge!.id}` })
        await db.from('charges').update({ stripe_payment_intent_id: pi.id }).eq('id', charge!.id)
      } catch {
        await db.from('charges').update({ status: 'failed' }).eq('id', charge!.id)
      }
    }
  }
  if (prof?.email) await sendEmail(db, { customerId: order.customer_id, orderId, template: 'charge_added', to: prof.email, subject: `Order #${order.order_number}: ${description}`, body: `A charge was added to your order: ${description}, ${money(Math.round(actual * (1 + payments.cardFeePercent / 100)))} (${money(actual)} with the ACH discount when you pay by bank).\n\nSee details and pay in your account.` })
  revalidatePath(`/admin/orders/${orderId}`)
}

export async function refundCharge(fd: FormData) {
  const { session } = await staff(true)
  const db = adminClient()!
  const { data: ch } = await db.from('charges').select('*').eq('id', String(fd.get('charge_id'))).single()
  if (!ch?.stripe_payment_intent_id || !stripe) throw new Error('Nothing to refund')
  const amount = Math.min(cents(fd.get('amount')) || ch.amount_cents, ch.amount_cents - ch.refunded_cents)
  await stripe.refunds.create({ payment_intent: ch.stripe_payment_intent_id, amount }, { idempotencyKey: `refund-${ch.id}-${ch.refunded_cents}-${amount}` })
  await audit(session.userId, 'refund', 'charges', ch.id, { amount })
  revalidatePath(`/admin/orders/${ch.order_id}`)
}

/** Intake from the admin order page. Same rules as /crew (overweight fee added automatically). */
export async function receiveItem(fd: FormData) {
  const { sb, session } = await staff()
  const r = await receive(sb, session.userId, {
    itemId: String(fd.get('item_id')), weight: parseFloat(String(fd.get('weight') ?? '')) || null,
    bin: String(fd.get('bin') ?? '') || null, actualName: String(fd.get('actual_name') ?? '') || null, note: null,
  })
  revalidatePath(`/admin/orders/${r.orderId}`)
}

// ---------------------------------------------------------------- claims
export async function updateClaim(fd: FormData) {
  const { sb, session } = await staff()
  const id = String(fd.get('id'))
  const status = String(fd.get('status'))
  if (!['submitted', 'reviewing', 'approved', 'denied', 'paid'].includes(status)) throw new Error('Bad status')
  const approved = String(fd.get('approved') ?? '').trim() ? cents(fd.get('approved')) : null
  const resolution = String(fd.get('resolution') ?? '').slice(0, 2000) || null
  const { data: before } = await sb.from('claims').select('status, order_id, customer_id').eq('id', id).single()
  await sb.from('claims').update({ status, approved_cents: approved, resolution, reviewed_by: session.userId, updated_at: new Date().toISOString() }).eq('id', id)
  await audit(session.userId, 'claim_update', 'claims', id, { status, approved, resolution })
  if (before && before.status !== status && fd.get('notify') === 'on') {
    const db = adminClient()!
    const { data: p } = await db.from('profiles').select('email').eq('id', before.customer_id).single()
    const { data: o } = await db.from('orders').select('order_number').eq('id', before.order_id).single()
    const words: Record<string, string> = {
      reviewing: 'We’re reviewing your claim and may contact you for more details.',
      approved: `Your claim has been approved${approved != null ? ` for ${money(approved)}` : ''}. We’ll be in touch about payment.`,
      denied: 'After review, we’re unable to approve your claim.',
      paid: `Your claim payment${approved != null ? ` of ${money(approved)}` : ''} has been issued.`,
      submitted: 'Your claim is open.',
    }
    if (p?.email) await sendEmail(db, { customerId: before.customer_id, orderId: before.order_id, template: `claim_${status}`, to: p.email, subject: `Claim update – order #${o?.order_number}`, body: `${words[status]}${resolution ? `\n\n${resolution}` : ''}` })
  }
  revalidatePath('/admin/claims')
}

// ---------------------------------------------------------------- promo codes
export async function createPromo(_prev: { error?: string; ok?: string } | null, fd: FormData): Promise<{ error?: string; ok?: string }> {
  const { sb, session } = await staff(true)
  const code = String(fd.get('code') ?? '').trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '').slice(0, 30)
  if (code.length < 3) return { error: 'Code must be at least 3 letters or numbers.' }
  const type = fd.get('type') === 'amount' ? 'amount' : 'percent'
  const value = parseFloat(String(fd.get('value') ?? ''))
  if (!(value > 0) || (type === 'percent' && value > 100)) return { error: 'Enter a valid discount.' }
  const row = {
    code,
    percent_off: type === 'percent' ? Math.round(value) : null,
    amount_off_cents: type === 'amount' ? Math.round(value * 100) : null,
    campus_id: String(fd.get('campus_id') || '') || null,
    expires_on: String(fd.get('expires_on') || '') || null,
    max_uses: parseInt(String(fd.get('max_uses') || ''), 10) || null,
    active: true,
  }
  const { error } = await sb.from('promo_codes').insert(row)
  if (error) return { error: error.code === '23505' ? 'That code already exists.' : 'Couldn’t save the code.' }
  await audit(session.userId, 'promo_create', 'promo_codes', code, row)
  revalidatePath('/admin/promos')
  return { ok: `Created ${code}.` }
}

export async function togglePromo(fd: FormData) {
  const { sb, session } = await staff(true)
  const id = String(fd.get('id')), active = fd.get('active') === 'true'
  await sb.from('promo_codes').update({ active }).eq('id', id)
  await audit(session.userId, active ? 'promo_enable' : 'promo_disable', 'promo_codes', id, {})
  revalidatePath('/admin/promos')
}
