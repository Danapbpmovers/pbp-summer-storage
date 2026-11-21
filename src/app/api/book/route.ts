import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { payments, siteUrl } from '@/config/site'
import { getCampusData } from '@/lib/campus'
import { money } from '@/lib/format'
import { sendEmail } from '@/lib/notify'
import { applyPaymentMethod, quote, type Promo } from '@/lib/pricing'
import { stripe, stripeMethodTypes } from '@/lib/stripe'
import { SUPABASE_ANON_KEY, SUPABASE_URL } from '@/lib/supabase/env'
import { adminClient, getSession } from '@/lib/supabase/server'
import type { WizardState } from '@/components/book/BookingWizard'
import { findPromo } from '@/lib/promo'
import { newLabelCode } from '@/lib/labels'

const bad = (error: string, status = 400) => NextResponse.json({ error }, { status })
const email = (v: unknown) => typeof v === 'string' && /^\S+@\S+\.\S+$/.test(v)
const str = (v: unknown, max = 300) => (typeof v === 'string' ? v.trim().slice(0, max) : '')

export async function POST(req: Request) {
  const db = adminClient()
  if (!db) return bad('Online booking isn’t connected yet. Please email us to book.', 503)

  let s: WizardState
  try { s = await req.json() } catch { return bad('Invalid request.') }
  if (!s?.student || !email(s.student.email) || !str(s.student.first_name) || !str(s.student.last_name)) return bad('Student name and email are required.')
  if (s.booked_by === 'parent' && !email(s.parent?.email)) return bad('Parent email is required.')
  if (!s.terms) return bad('Please accept the terms.')
  if (s.service !== 'storage' && s.service !== 'ship_ahead') return bad('Choose a service.')
  const method = s.pay_method === 'card' ? 'card' : 'ach'
  const anyItems = s.service === 'storage' ? Object.values(s.items ?? {}).some((n) => Number(n) > 0) : Number(s.ship_ahead_count) > 0
  if (!anyItems) return bad(s.service === 'storage' ? 'Add at least one item.' : 'Enter how many items you’ll ship.')

  const data = await getCampusData(str(s.campus, 80))
  if (!data || !data.campus.bookable || data.campus.id.startsWith('seed-')) return bad('That school isn’t open for booking.')

  // ---------------------------------------------------------------- account
  const session = await getSession()
  let userId = session?.userId
  let accountEmail = session?.email
  let newAccount = false
  if (!userId) {
    accountEmail = (s.booked_by === 'parent' ? s.parent.email : s.student.email).toLowerCase()
    if (typeof s.password !== 'string' || s.password.length < 8) return bad('Choose a password with at least 8 characters.')
    const anon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false } })
    const { data: su, error } = await anon.auth.signUp({
      email: accountEmail,
      password: s.password,
      options: {
        emailRedirectTo: `${siteUrl}/login?confirmed=1&next=/app`,
        data: {
          first_name: s.booked_by === 'parent' ? str(s.parent.name).split(' ')[0] : str(s.student.first_name),
          last_name: s.booked_by === 'parent' ? str(s.parent.name).split(' ').slice(1).join(' ') : str(s.student.last_name),
          phone: s.booked_by === 'parent' ? str(s.parent.phone, 30) : str(s.student.phone, 30),
          student_id: s.booked_by === 'student' ? str(s.student.student_id, 40) : '',
          class_year: s.booked_by === 'student' ? str(s.student.class_year, 10) : '',
          campus_slug: data.campus.slug,
          account_type: s.booked_by,
          referral_source: str(s.referral_source, 60),
          sms_consent: !!s.sms_consent,
          marketing_consent: !!s.marketing_consent,
          terms_accepted: true,
        },
      },
    })
    if (error) return bad(error.message.includes('rate') ? 'Too many attempts. Please wait a minute and try again.' : error.message)
    if (!su.user || su.user.identities?.length === 0) return bad('An account with this email already exists. Please log in, then book.', 409)
    userId = su.user.id
    newAccount = true
  } else if (s.sms_consent) {
    await db.from('profiles').update({ sms_consent: true, sms_consent_at: new Date().toISOString() }).eq('id', userId)
  }

  // ---------------------------------------------------------------- price (server-side, never trust the browser)
  let promo: Promo | null = null
  if (str(s.promo_code, 40)) {
    const p = await findPromo(db, str(s.promo_code, 40), data.campus.id)
    if (!p.ok) return bad(p.error)
    promo = p.promo
  }
  const items = s.items ?? {}
  const q = quote(data, {
    service: s.service, items, ship_ahead_count: Number(s.ship_ahead_count) || 0, ship_ahead_oversize: Number(s.ship_ahead_oversize) || 0,
    declared_value_cents: Number(s.declared_value_cents) || 0,
    dropoff_method: s.service !== 'storage' ? 'undecided' : s.dropoff_method,
    dropoff_date: s.dropoff_date || null, return_method: s.return_method,
  }, promo)
  const pay = applyPaymentMethod(q, method, payments)
  if (q.item_count === 0 || pay.total_cents <= 0) return bad(s.service === 'storage' ? 'Add at least one item.' : 'Enter how many items you’ll ship.')

  // ---------------------------------------------------------------- capacity
  let slotId: string | null = null
  if (s.service === 'storage' && s.dropoff_slot_id) {
    const slot = (data.slots ?? []).find((x) => x.id === s.dropoff_slot_id)
    if (!slot) return bad('That drop-off time is no longer available.')
    const { data: ok } = await db.rpc('book_slot', { p_slot: slot.id })
    if (!ok) return bad('That drop-off time just filled up. Please choose another.', 409)
    slotId = slot.id
  }

  // ---------------------------------------------------------------- order
  const season = (data.calendar.find((c) => c.key === 'peak_move_out')?.starts_on ?? new Date().toISOString()).slice(0, 4)
  const { data: order, error: oErr } = await db.from('orders').insert({
    customer_id: userId,
    campus_id: data.campus.id,
    service: s.service,
    season,
    status: 'pending_payment',
    booked_by: s.booked_by === 'parent' ? 'parent' : 'student',
    student_first_name: str(s.student.first_name), student_last_name: str(s.student.last_name),
    student_email: s.student.email.toLowerCase(), student_phone: str(s.student.phone, 30), student_school_id: str(s.student.student_id, 40),
    declared_value_cents: q.coverage.declared_cents,
    dropoff_method: s.service !== 'storage' ? 'undecided' : s.dropoff_method,
    dropoff_address: str(s.dropoff_address),
    return_method: ['on_campus', 'off_campus', 'ship', 'extended'].includes(s.return_method) ? s.return_method : 'undecided',
    return_hall: str(s.return_hall, 120), return_address: str(s.return_address),
    early_withdrawal: !!s.early_withdrawal,
    proxy_name: str(s.proxy_name, 120), proxy_phone: str(s.proxy_phone, 30),
    notes: str(s.notes, 2000), promo_code: promo?.code ?? null,
    quoted_cents: pay.total_cents,
  }).select('id, order_number').single()
  if (oErr || !order) {
    if (slotId) await db.rpc('release_slot', { p_slot: slotId })
    return bad('We couldn’t save your booking. Please try again.', 500)
  }

  // One row per physical item, each with its own QR label code.
  const rows: object[] = []
  for (const l of q.lines) {
    if (l.kind !== 'item' && l.kind !== 'ship_ahead') continue
    const cat = data.catalog.find((c) => c.id === l.ref)
    for (let i = 0; i < l.qty; i++) rows.push({ order_id: order.id, catalog_item_id: cat?.id ?? null, name: l.label, category: cat?.category ?? 'ship_ahead', unit_price_cents: l.unit_cents, label_code: newLabelCode() })
  }
  if (rows.length) await db.from('order_items').insert(rows)

  if (s.service === 'storage' && s.dropoff_method !== 'undecided') {
    await db.from('appointments').insert({
      order_id: order.id, kind: s.dropoff_method === 'station' ? 'station_dropoff' : 'curbside_pickup', slot_id: slotId,
      location_id: s.dropoff_method === 'station' ? s.dropoff_location_id || null : null,
      date: s.dropoff_date || null, window_label: str(s.dropoff_window, 60), address: str(s.dropoff_address), status: 'scheduled',
    })
  }
  if (s.booked_by === 'parent') {
    await db.from('collaborators').insert({ owner_id: userId, email: s.student.email.toLowerCase(), can_pay: false, can_schedule: true, can_edit_items: false })
  }
  if (promo) await db.rpc('use_promo', { p_code: promo.code })

  // ---------------------------------------------------------------- payment
  const orderUrl = newAccount ? `${siteUrl}/book/thanks?order=${order.order_number}` : `${siteUrl}/app/orders/${order.id}`
  const summary = q.lines.map((l) => `• ${l.label}${l.qty > 1 ? ` × ${l.qty}` : ''}: ${money(l.total_cents)}`).join('\n')

  const { data: charge } = await db.from('charges').insert({
    order_id: order.id, customer_id: userId, description: `Order #${order.order_number} – ${s.service === 'storage' ? 'storage' : 'Ship Ahead'}`,
    amount_cents: pay.total_cents, payment_method: method, card_fee_cents: method === 'card' ? pay.ach_discount_cents : 0, status: 'open',
  }).select('id').single()

  if (!stripe) {
    await sendEmail(db, { customerId: userId, orderId: order.id, template: 'booking_pending', to: accountEmail!, subject: `Order #${order.order_number} received`, body: `We’ve received your booking:\n\n${summary}\n\nTotal ${money(pay.total_cents)} (${method === 'ach' ? `bank transfer, ACH discount of ${money(pay.ach_discount_cents)} applied` : 'card'}). We’ll send a payment link shortly.` })
    return NextResponse.json({ redirect: `${orderUrl}${orderUrl.includes('?') ? '&' : '?'}pending=1` })
  }

  // Stripe customer (reused for later off-session charges)
  const { data: prof } = await db.from('profiles').select('stripe_customer_id, first_name, last_name, phone').eq('id', userId).single()
  let customer = prof?.stripe_customer_id as string | null
  if (!customer) {
    const c = await stripe.customers.create({ email: accountEmail, name: `${prof?.first_name ?? ''} ${prof?.last_name ?? ''}`.trim() || undefined, phone: prof?.phone || undefined, metadata: { profile_id: userId! } })
    customer = c.id
    await db.from('profiles').update({ stripe_customer_id: customer }).eq('id', userId)
  }

  const checkout = await stripe.checkout.sessions.create({
    mode: 'payment',
    customer,
    payment_method_types: stripeMethodTypes(method),
    line_items: [{
      quantity: 1,
      price_data: {
        currency: 'usd',
        unit_amount: pay.total_cents,
        product_data: { name: `${data.campus.short_name} ${s.service === 'storage' ? 'summer storage' : 'Ship Ahead'} – order #${order.order_number}`, description: `${q.item_count} item(s)${method === 'card' ? ' · card' : ' · ACH discount applied'}` },
      },
    }],
    payment_intent_data: { setup_future_usage: 'off_session', metadata: { order_id: order.id, charge_id: charge?.id ?? '' } },
    ...(method === 'ach' ? { payment_method_options: { us_bank_account: { verification_method: 'automatic' } } } : {}),
    metadata: { order_id: order.id, charge_id: charge?.id ?? '' },
    success_url: `${orderUrl}${orderUrl.includes('?') ? '&' : '?'}paid=1`,
    cancel_url: `${orderUrl}${orderUrl.includes('?') ? '&' : '?'}cancelled=1`,
  })
  await db.from('charges').update({ stripe_checkout_session_id: checkout.id }).eq('id', charge?.id)
  return NextResponse.json({ redirect: checkout.url })
}
