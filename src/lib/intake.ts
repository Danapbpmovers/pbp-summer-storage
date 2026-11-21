import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import { adminClient } from './supabase/server'

// Shared intake logic for /admin and /crew. `sb` is the staff member's own
// client (RLS checks staff role); charges are written with the service role.

export const OVERWEIGHT_LIMIT_LBS = 50

async function feeFor(sb: SupabaseClient, orderId: string, code: string) {
  const { data: order } = await sb.from('orders').select('customer_id, campus_id').eq('id', orderId).single()
  if (!order) return null
  const { data: fee } = await sb.from('fee_rules').select('name, amount_cents').eq('campus_id', order.campus_id).eq('code', code).eq('active', true).maybeSingle()
  return fee ? { ...fee, customer_id: order.customer_id as string } : null
}

export async function receive(sb: SupabaseClient, staffId: string, input: { itemId: string; weight: number | null; bin: string | null; actualName: string | null; note: string | null }) {
  const { data: item, error } = await sb.from('order_items').update({
    status: 'received', received_at: new Date().toISOString(), received_by: staffId,
    weight_lbs: input.weight, warehouse_bin: input.bin, actual_name: input.actualName, intake_note: input.note,
  }).eq('id', input.itemId).select('id, order_id, label_code, exceptions').single()
  if (error || !item) throw new Error('Item not found')

  let overweightCents = 0
  if (input.weight && input.weight > OVERWEIGHT_LIMIT_LBS && !item.exceptions?.includes('overweight')) {
    const fee = await feeFor(sb, item.order_id, 'overweight')
    if (fee) {
      const over = Math.ceil(input.weight - OVERWEIGHT_LIMIT_LBS)
      overweightCents = over * fee.amount_cents
      await adminClient()!.from('charges').insert({ order_id: item.order_id, customer_id: fee.customer_id, description: `Overweight ${item.label_code}: ${over} lb over ${OVERWEIGHT_LIMIT_LBS}`, amount_cents: overweightCents, fee_code: 'overweight', status: 'open', payment_method: 'ach', created_by: staffId })
      await sb.from('order_items').update({ exceptions: [...(item.exceptions ?? []), 'overweight'] }).eq('id', item.id)
    }
  }
  // First item received moves the order along.
  await sb.from('orders').update({ status: 'received', updated_at: new Date().toISOString() }).eq('id', item.order_id).in('status', ['confirmed', 'scheduled', 'reserved', 'pending_payment'])
  return { orderId: item.order_id as string, overweightCents }
}

/** Per-item fee from the campus fee list (unthawed fridge, shrinkwrap…). Logged once per item. */
export async function addException(sb: SupabaseClient, staffId: string, itemId: string, code: string) {
  const { data: item } = await sb.from('order_items').select('id, order_id, label_code, exceptions').eq('id', itemId).single()
  if (!item) throw new Error('Item not found')
  if (item.exceptions?.includes(code)) return { orderId: item.order_id as string, added: false }
  const fee = await feeFor(sb, item.order_id, code)
  if (fee) {
    await adminClient()!.from('charges').insert({ order_id: item.order_id, customer_id: fee.customer_id, description: `${fee.name}: ${item.label_code}`, amount_cents: fee.amount_cents, fee_code: code, status: 'open', payment_method: 'ach', created_by: staffId })
  }
  await sb.from('order_items').update({ exceptions: [...(item.exceptions ?? []), code] }).eq('id', item.id)
  return { orderId: item.order_id as string, added: true }
}
