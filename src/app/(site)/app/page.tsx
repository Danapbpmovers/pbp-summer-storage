import Link from 'next/link'
import { serverClient, getSession } from '@/lib/supabase/server'
import { money } from '@/lib/format'
import { orderStatusLabel } from '@/lib/types'

export default async function Dashboard() {
  const [sb, session] = await Promise.all([serverClient(), getSession()])
  const { data: orders } = await sb!.from('orders')
    .select('id, order_number, service, status, season, customer_id, student_first_name, student_last_name, quoted_cents, paid_cents, campuses(name, short_name), order_items(count)')
    .order('created_at', { ascending: false })
  const { data: open } = await sb!.from('charges').select('id, order_id, description, amount_cents').in('status', ['open', 'failed'])
  const name = session?.profile?.first_name

  return (
    <>
      <h1 className="h2">{name ? `Hi, ${name}` : 'Your account'}</h1>
      {open && open.length > 0 && (
        <div className="mt-6 rounded-2xl border border-gold-500/50 bg-gold-100 p-5">
          <h2 className="h3">Payment due</h2>
          <ul className="mt-2 space-y-1">{open.map((c) => <li key={c.id}><Link href={`/app/orders/${c.order_id}#billing`} className="font-semibold text-ink-900 underline">{c.description}: {money(c.amount_cents)}</Link></li>)}</ul>
        </div>
      )}
      <div className="mt-8 flex items-center justify-between">
        <h2 className="h3 text-xl">Orders</h2>
        <Link href="/book" className="btn-primary btn-sm">New booking</Link>
      </div>
      {!orders?.length ? (
        <div className="card mt-4"><p className="text-stone-600">No orders yet.</p><Link href="/book" className="btn-dark mt-4">Book storage</Link></div>
      ) : (
        <ul className="mt-4 grid gap-4 md:grid-cols-2">
          {orders.map((o) => {
            const campus = o.campuses as unknown as { name: string; short_name: string } | null
            const count = (o.order_items as unknown as { count: number }[])?.[0]?.count ?? 0
            return (
              <li key={o.id}>
                <Link href={`/app/orders/${o.id}`} className="card block transition hover:border-ink-700">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm text-stone-500">#{o.order_number} · {campus?.short_name} · {o.season}</p>
                      <p className="mt-1 text-lg font-bold text-ink-900">{o.service === 'storage' ? 'Summer storage' : 'Ship Ahead'}{o.customer_id !== session?.userId ? ` · ${o.student_first_name}` : ''}</p>
                    </div>
                    <span className="badge bg-sand-100 text-ink-800">{orderStatusLabel(o.status)}</span>
                  </div>
                  <p className="mt-3 text-sm text-stone-600">{count} item{count === 1 ? '' : 's'} · {money(o.paid_cents)} paid</p>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </>
  )
}
