import Link from 'next/link'
import { serverClient } from '@/lib/supabase/server'
import { money, shortDay } from '@/lib/format'
import { orderStatusLabel, orderStatusSteps } from '@/lib/types'

export default async function AdminOrders({ searchParams }: { searchParams: Promise<{ status?: string; q?: string }> }) {
  const { status, q } = await searchParams
  const sb = (await serverClient())!
  let query = sb.from('orders').select('id, order_number, status, service, student_first_name, student_last_name, student_email, quoted_cents, paid_cents, delivery_hold, created_at, campuses(short_name)').order('created_at', { ascending: false }).limit(200)
  if (status) query = query.eq('status', status)
  if (q) {
    const term = q.replace(/[%,()]/g, '').slice(0, 60)
    query = /^\d+$/.test(term) ? query.eq('order_number', Number(term)) : query.or(`student_last_name.ilike.%${term}%,student_email.ilike.%${term}%,student_first_name.ilike.%${term}%`)
  }
  const { data: orders } = await query
  return (
    <>
      <h1 className="h2">Orders</h1>
      <form className="mt-5 flex flex-wrap gap-2" action="/admin/orders">
        <input name="q" defaultValue={q} placeholder="Name, email or order #" className="input max-w-xs" />
        <select name="status" defaultValue={status ?? ''} className="input max-w-[200px]">
          <option value="">All statuses</option>
          {[...orderStatusSteps.map((x) => x.status), 'pending_payment', 'cancelled'].map((s) => <option key={s} value={s}>{orderStatusLabel(s)}</option>)}
        </select>
        <button className="btn-dark btn-sm">Filter</button>
      </form>
      <div className="mt-5 overflow-x-auto rounded-xl border border-stone-200 bg-white">
        <table className="tbl">
          <thead><tr><th>#</th><th>Student</th><th>Campus</th><th>Service</th><th>Status</th><th className="text-right">Quoted / paid</th><th>Created</th></tr></thead>
          <tbody>
            {(orders ?? []).map((o) => (
              <tr key={o.id}>
                <td><Link href={`/admin/orders/${o.id}`} className="font-semibold text-pbp-700 underline">{o.order_number}</Link></td>
                <td>{o.student_first_name} {o.student_last_name}<span className="block text-xs text-stone-500">{o.student_email}</span></td>
                <td>{(o.campuses as unknown as { short_name: string } | null)?.short_name}</td>
                <td>{o.service === 'storage' ? 'Storage' : 'Ship Ahead'}</td>
                <td>{orderStatusLabel(o.status)}{o.delivery_hold && <span className="badge ml-1 bg-red-100 text-red-800">hold</span>}</td>
                <td className="text-right">{money(o.quoted_cents)}<span className="block text-xs text-stone-500">{money(o.paid_cents)}</span></td>
                <td className="whitespace-nowrap">{shortDay(o.created_at)}</td>
              </tr>
            ))}
            {!orders?.length && <tr><td colSpan={7} className="text-stone-500">No orders match.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  )
}
