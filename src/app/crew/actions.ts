'use server'
import { getSession, isStaffRole, serverClient } from '@/lib/supabase/server'
import { addException, receive } from '@/lib/intake'
import { newLabelCode } from '@/lib/labels'
import { adminClient } from '@/lib/supabase/server'

async function crew() {
  const [sb, session] = await Promise.all([serverClient(), getSession()])
  if (!sb || !session || !isStaffRole(session.profile?.role)) throw new Error('Not allowed')
  return { sb, session }
}

export interface CrewItem {
  id: string
  label_code: string
  name: string
  actual_name: string | null
  status: string
  weight_lbs: number | null
  warehouse_bin: string | null
  intake_note: string | null
  exceptions: string[]
  photos: { path: string; url: string }[]
  order: { id: string; order_number: number; student: string; phone: string | null; campus_id: string; item_count: number; received_count: number; delivery_hold: boolean; balance_cents: number }
  fees: { code: string; name: string; amount_cents: number }[]
  catalog: { id: string; name: string; price_cents: number }[]
}

const EXCEPTION_FEES = ['unthawed_fridge', 'shrinkwrap']

export async function lookup(rawCode: string): Promise<{ ok: true; item: CrewItem } | { ok: false; error: string }> {
  const { sb } = await crew()
  const code = rawCode.trim().toUpperCase().replace(/^PSS-?/, 'PSS-')
  const { data: it } = await sb.from('order_items').select('*').eq('label_code', code).maybeSingle()
  if (!it) return { ok: false, error: `No item with label ${code}.` }
  return { ok: true, item: await load(sb, it.id) }
}

async function load(sb: Awaited<ReturnType<typeof crew>>['sb'], itemId: string): Promise<CrewItem> {
  const { data: it } = await sb.from('order_items').select('*').eq('id', itemId).single()
  const { data: o } = await sb.from('orders').select('id, order_number, student_first_name, student_last_name, student_phone, campus_id, delivery_hold').eq('id', it!.order_id).single()
  const [{ data: siblings }, { data: fees }, { data: catalog }, { data: open }] = await Promise.all([
    sb.from('order_items').select('status').eq('order_id', o!.id),
    sb.from('fee_rules').select('code, name, amount_cents').eq('campus_id', o!.campus_id).in('code', EXCEPTION_FEES).eq('active', true),
    sb.from('catalog_items').select('id, name, price_cents').eq('campus_id', o!.campus_id).eq('active', true).neq('category', 'supplies').order('sort'),
    sb.from('charges').select('amount_cents').eq('order_id', o!.id).in('status', ['open', 'failed']),
  ])
  const paths: string[] = it!.photos ?? []
  const signed = paths.length ? (await sb.storage.from('intake-photos').createSignedUrls(paths, 3600)).data ?? [] : []
  return {
    id: it!.id, label_code: it!.label_code, name: it!.name, actual_name: it!.actual_name, status: it!.status,
    weight_lbs: it!.weight_lbs, warehouse_bin: it!.warehouse_bin, intake_note: it!.intake_note, exceptions: it!.exceptions ?? [],
    photos: signed.map((s, i) => ({ path: paths[i], url: s.signedUrl ?? '' })),
    order: {
      id: o!.id, order_number: o!.order_number, student: `${o!.student_first_name} ${o!.student_last_name}`, phone: o!.student_phone, campus_id: o!.campus_id,
      item_count: siblings?.length ?? 0, received_count: siblings?.filter((s) => s.status !== 'expected').length ?? 0,
      delivery_hold: o!.delivery_hold, balance_cents: (open ?? []).reduce((t, c) => t + c.amount_cents, 0),
    },
    fees: fees ?? [],
    catalog: catalog ?? [],
  }
}

export async function markReceived(input: { itemId: string; weight: string; bin: string; actualName: string; note: string }) {
  const { sb, session } = await crew()
  const weight = parseFloat(input.weight) || null
  if (weight !== null && (weight < 0 || weight > 300)) throw new Error('Check the weight.')
  const r = await receive(sb, session.userId, { itemId: input.itemId, weight, bin: input.bin.trim() || null, actualName: input.actualName.trim() || null, note: input.note.trim() || null })
  return { item: await load(sb, input.itemId), overweightCents: r.overweightCents }
}

export async function logException(itemId: string, code: string) {
  const { sb, session } = await crew()
  if (!EXCEPTION_FEES.includes(code)) throw new Error('Unknown fee')
  await addException(sb, session.userId, itemId, code)
  return load(sb, itemId)
}

export async function attachPhoto(itemId: string, path: string) {
  const { sb } = await crew()
  const { data: it } = await sb.from('order_items').select('order_id, photos').eq('id', itemId).single()
  if (!it || !path.startsWith(`${it.order_id}/`)) throw new Error('Bad photo path')
  await sb.from('order_items').update({ photos: [...(it.photos ?? []), path] }).eq('id', itemId)
  return load(sb, itemId)
}

/** Item brought to the station that wasn't booked: adds it to the order with a new label and an open charge. */
export async function addUnbookedItem(orderId: string, catalogItemId: string) {
  const { sb, session } = await crew()
  const { data: cat } = await sb.from('catalog_items').select('id, name, category, price_cents').eq('id', catalogItemId).single()
  const { data: o } = await sb.from('orders').select('id, customer_id, order_number').eq('id', orderId).single()
  if (!cat || !o) throw new Error('Not found')
  const label = newLabelCode()
  const { data: it } = await sb.from('order_items').insert({ order_id: o.id, catalog_item_id: cat.id, name: cat.name, category: cat.category, unit_price_cents: cat.price_cents, label_code: label }).select('id').single()
  await adminClient()!.from('charges').insert({ order_id: o.id, customer_id: o.customer_id, description: `Added at drop-off: ${cat.name} (${label})`, amount_cents: cat.price_cents, status: 'open', payment_method: 'ach', created_by: session.userId })
  return load(sb, it!.id)
}
