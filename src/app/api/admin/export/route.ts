import { getSession, isStaffRole, serverClient } from '@/lib/supabase/server'

const csv = (v: unknown) => {
  const s = v === null || v === undefined ? '' : String(v)
  // Neutralize spreadsheet formulas and quote everything.
  return `"${(/^[=+\-@]/.test(s) ? `'${s}` : s).replace(/"/g, '""')}"`
}

export async function GET() {
  const [sb, session] = await Promise.all([serverClient(), getSession()])
  if (!sb || !isStaffRole(session?.profile?.role)) return new Response('Not allowed', { status: 403 })
  const { data } = await sb.from('orders').select('order_number, status, service, season, student_first_name, student_last_name, student_email, student_phone, student_school_id, dropoff_method, return_method, return_hall, return_address, declared_value_cents, quoted_cents, paid_cents, delivery_hold, created_at, campuses(short_name), order_items(count)').order('order_number')
  const cols = ['order_number', 'campus', 'status', 'service', 'season', 'student_first_name', 'student_last_name', 'student_email', 'student_phone', 'student_school_id', 'items', 'dropoff_method', 'return_method', 'return_hall', 'return_address', 'declared_value', 'quoted', 'paid', 'delivery_hold', 'created_at']
  const rows = (data ?? []).map((o) => {
    const r = o as Record<string, unknown>
    return [o.order_number, (o.campuses as unknown as { short_name: string } | null)?.short_name, o.status, o.service, o.season, o.student_first_name, o.student_last_name, o.student_email, o.student_phone, o.student_school_id,
      (r.order_items as { count: number }[])?.[0]?.count ?? 0, o.dropoff_method, o.return_method, o.return_hall, o.return_address,
      (o.declared_value_cents / 100).toFixed(2), (o.quoted_cents / 100).toFixed(2), (o.paid_cents / 100).toFixed(2), o.delivery_hold, o.created_at].map(csv).join(',')
  })
  return new Response([cols.join(','), ...rows].join('\n'), { headers: { 'content-type': 'text/csv', 'content-disposition': `attachment; filename="orders-${new Date().toISOString().slice(0, 10)}.csv"` } })
}
