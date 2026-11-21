'use server'
import { revalidatePath } from 'next/cache'
import { payments } from '@/config/site'
import { getSession, isManagerRole, isStaffRole, serverClient, adminClient } from '@/lib/supabase/server'
import { stripe } from '@/lib/stripe'
import { sendEmail } from '@/lib/notify'
import { money } from '@/lib/format'

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
          ...(pm.type === 'us_bank_account' ? { payment_method_types: ['us_bank_account'] } : {}),
        })
        await db.from('charges').update({ stripe_payment_intent_id: pi.id }).eq('id', charge!.id)
      } catch {
        await db.from('charges').update({ status: 'failed' }).eq('id', charge!.id)
      }
    }
  }
  if (prof?.email) await sendEmail(db, { customerId: order.customer_id, orderId, template: 'charge_added', to: prof.email, subject: `Order #${order.order_number}: ${description}`, body: `A charge was added to your order: ${description}, ${money(actual)} (bank transfer price; card is ${payments.cardFeePercent}% more).\n\nSee details and pay in your account.` })
  revalidatePath(`/admin/orders/${orderId}`)
}

export async function refundCharge(fd: FormData) {
  const { session } = await staff(true)
  const db = adminClient()!
  const { data: ch } = await db.from('charges').select('*').eq('id', String(fd.get('charge_id'))).single()
  if (!ch?.stripe_payment_intent_id || !stripe) throw new Error('Nothing to refund')
  const amount = Math.min(cents(fd.get('amount')) || ch.amount_cents, ch.amount_cents - ch.refunded_cents)
  await stripe.refunds.create({ payment_intent: ch.stripe_payment_intent_id, amount })
  await audit(session.userId, 'refund', 'charges', ch.id, { amount })
  revalidatePath(`/admin/orders/${ch.order_id}`)
}

/** Intake: mark received, log weight and photos. Overweight fee is added automatically. */
export async function receiveItem(fd: FormData) {
  const { sb, session } = await staff()
  const id = String(fd.get('item_id'))
  const weight = parseFloat(String(fd.get('weight') ?? '')) || null
  const { data: item } = await sb.from('order_items').update({
    status: 'received', received_at: new Date().toISOString(), received_by: session.userId, weight_lbs: weight,
    warehouse_bin: String(fd.get('bin') ?? '') || null, actual_name: String(fd.get('actual_name') ?? '') || null,
  }).eq('id', id).select('id, order_id, label_code').single()
  if (item && weight && weight > 50) {
    const { data: order } = await sb.from('orders').select('customer_id, campus_id').eq('id', item.order_id).single()
    const { data: fee } = await sb.from('fee_rules').select('amount_cents').eq('campus_id', order!.campus_id).eq('code', 'overweight').maybeSingle()
    if (fee) await adminClient()!.from('charges').insert({ order_id: item.order_id, customer_id: order!.customer_id, description: `Overweight ${item.label_code}: ${Math.ceil(weight - 50)} lb over 50`, amount_cents: Math.ceil(weight - 50) * fee.amount_cents, fee_code: 'overweight', status: 'open', payment_method: 'ach', created_by: session.userId })
  }
  revalidatePath(`/admin/orders/${item?.order_id}`)
}
