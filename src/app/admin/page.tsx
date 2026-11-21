import Link from 'next/link'
import { serverClient } from '@/lib/supabase/server'
import { ownerQuestions } from '@/data/seed'
import { shortDay, todayIso, money } from '@/lib/format'
import { orderStatusLabel } from '@/lib/types'

export default async function AdminHome() {
  const sb = (await serverClient())!
  const today = todayIso()
  const [{ data: orders }, { data: appts }, { data: open }, { data: unconfirmed }, { count: openClaims }] = await Promise.all([
    sb.from('orders').select('status'),
    sb.from('appointments').select('id, kind, date, window_label, address, hall, orders(id, order_number, student_first_name, student_last_name), locations(name)').gte('date', today).order('date').limit(25),
    sb.from('charges').select('amount_cents').in('status', ['open', 'failed']),
    sb.from('calendar_windows').select('label').eq('confirmed', false),
    sb.from('claims').select('id', { count: 'exact', head: true }).in('status', ['submitted', 'reviewing']),
  ])
  const counts = (orders ?? []).reduce<Record<string, number>>((m, o) => ({ ...m, [o.status]: (m[o.status] ?? 0) + 1 }), {})
  return (
    <>
      <h1 className="h2">Overview</h1>
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
        <Stat k="Orders" v={String(orders?.length ?? 0)} />
        {Object.entries(counts).map(([s, n]) => <Stat key={s} k={orderStatusLabel(s)} v={String(n)} href={`/admin/orders?status=${s}`} />)}
        <Stat k="Open claims" v={String(openClaims ?? 0)} href="/admin/claims" />
        <Stat k="Unpaid balance" v={money((open ?? []).reduce((t, c) => t + c.amount_cents, 0))} />
      </div>
      <div className="mt-8 grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <section className="panel">
          <h2 className="h3">Upcoming appointments</h2>
          <table className="tbl mt-3">
            <thead><tr><th>Date</th><th>Type</th><th>Where</th><th>Order</th></tr></thead>
            <tbody>
              {(appts ?? []).map((a) => {
                const o = a.orders as unknown as { id: string; order_number: number; student_first_name: string; student_last_name: string }
                return (
                  <tr key={a.id}>
                    <td className="whitespace-nowrap">{a.date ? shortDay(a.date) : '—'}<span className="block text-xs text-stone-500">{a.window_label}</span></td>
                    <td className="capitalize">{a.kind.replace('_', ' ')}</td>
                    <td>{(a.locations as unknown as { name: string } | null)?.name ?? a.hall ?? a.address}</td>
                    <td><Link href={`/admin/orders/${o.id}`} className="font-semibold text-pbp-700 underline">#{o.order_number}</Link> {o.student_first_name} {o.student_last_name}</td>
                  </tr>
                )
              })}
              {!appts?.length && <tr><td colSpan={4} className="text-stone-500">Nothing scheduled.</td></tr>}
            </tbody>
          </table>
        </section>
        <section className="panel border-gold-500/50 bg-gold-100/40">
          <h2 className="h3">Needs owner confirmation</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-stone-700">
            {ownerQuestions.map((q) => <li key={q}>{q}</li>)}
            {!!unconfirmed?.length && <li>{unconfirmed.length} calendar date(s) still unconfirmed. <Link href="/admin/calendar" className="font-semibold underline">Review dates</Link></li>}
          </ul>
        </section>
      </div>
    </>
  )
}

function Stat({ k, v, href }: { k: string; v: string; href?: string }) {
  const inner = <><p className="text-xs text-stone-500">{k}</p><p className="mt-1 text-2xl font-extrabold text-ink-900">{v}</p></>
  return href ? <Link href={href} className="panel block hover:border-ink-700">{inner}</Link> : <div className="panel">{inner}</div>
}
