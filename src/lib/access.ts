import 'server-only'
import { getSession, isStaffRole, serverClient } from './supabase/server'

export interface OrderAccess {
  userId: string
  email: string
  order: { id: string; order_number: number; customer_id: string; campus_id: string; status: string; return_method: string; delivery_hold: boolean }
  canPay: boolean
  canSchedule: boolean
  staff: boolean
}

/** Resolves what the signed-in user may do with an order (owner, collaborator or staff). */
export async function orderAccess(orderId: string): Promise<OrderAccess | null> {
  const [sb, session] = await Promise.all([serverClient(), getSession()])
  if (!sb || !session) return null
  const { data: order } = await sb.from('orders').select('id, order_number, customer_id, campus_id, status, return_method, delivery_hold').eq('id', orderId).maybeSingle()
  if (!order) return null // RLS hides orders the user can't see
  const staff = isStaffRole(session.profile?.role)
  if (staff || order.customer_id === session.userId) return { userId: session.userId, email: session.email, order, canPay: true, canSchedule: true, staff }
  const { data: c } = await sb.from('collaborators').select('can_pay, can_schedule').eq('owner_id', order.customer_id).ilike('email', session.email).maybeSingle()
  return { userId: session.userId, email: session.email, order, canPay: !!c?.can_pay, canSchedule: !!c?.can_schedule, staff: false }
}
