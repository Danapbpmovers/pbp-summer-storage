import Link from 'next/link'
import { notFound } from 'next/navigation'
import { serverClient } from '@/lib/supabase/server'
import { money, shortDay } from '@/lib/format'
import { orderStatusLabel, orderStatusSteps } from '@/lib/types'
import { addCharge, receiveItem, refundCharge, updateOrder } from '../../actions'

export default async function AdminOrder({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const sb = (await serverClient())!
  const { data: o } = await sb.from('orders').select('*, campuses(name, short_name), profiles(email, phone, first_name, last_name, stripe_customer_id)').eq('id', id).maybeSingle()
  if (!o) notFound()
  const [{ data: items }, { data: charges }, { data: appts }, { data: fees }] = await Promise.all([
    sb.from('order_items').select('*').eq('order_id', id).order('created_at'),
    sb.from('charges').select('*').eq('order_id', id).order('created_at'),
    sb.from('appointments').select('*, locations(name)').eq('order_id', id).order('created_at'),
    sb.from('fee_rules').select('code, name, amount_cents, unit').eq('campus_id', o.campus_id).eq('active', true).order('sort'),
  ])
  const acct = o.profiles as { email: string; phone: string; first_name: string; last_name: string; stripe_customer_id: string | null }

  return (
    <>
      <Link href="/admin/orders" className="text-sm font-semibold text-pbp-700">← Orders</Link>
      <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
        <h1 className="h2">#{o.order_number} · {o.student_first_name} {o.student_last_name}</h1>
        <span className="badge bg-ink-900 px-3 py-1 text-sm text-white">{orderStatusLabel(o.status)}</span>
      </div>
      <p className="mt-1 text-stone-600">{(o.campuses as { name: string }).name} · {o.service === 'storage' ? 'Summer storage' : 'Ship Ahead'} · booked by {o.booked_by} · account {acct.email} {acct.phone}</p>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <div className="space-y-6">
          <section className="panel">
            <h2 className="h3">Items & intake</h2>
            <div className="mt-3 overflow-x-auto">
              <table className="tbl">
                <thead><tr><th>Label</th><th>Item</th><th>Status</th><th>Receive</th></tr></thead>
                <tbody>
                  {(items ?? []).map((it) => (
                    <tr key={it.id}>
                      <td className="font-mono text-xs">{it.label_code}</td>
                      <td>{it.actual_name ?? it.name}<span className="block text-xs text-stone-500">{money(it.unit_price_cents)}{it.weight_lbs ? ` · ${it.weight_lbs} lb` : ''}{it.warehouse_bin ? ` · bin ${it.warehouse_bin}` : ''}</span></td>
                      <td className="capitalize">{it.status}</td>
                      <td>
                        {it.status === 'expected' ? (
                          <form action={receiveItem} className="flex flex-wrap gap-1">
                            <input type="hidden" name="item_id" value={it.id} />
                            <input name="weight" inputMode="decimal" placeholder="lb" className="input min-h-9 w-16 px-2 py-1" aria-label="Weight in pounds" />
                            <input name="bin" placeholder="bin" className="input min-h-9 w-16 px-2 py-1" aria-label="Warehouse bin" />
                            <button className="btn-dark btn-sm">Received</button>
                          </form>
                        ) : it.received_at ? <span className="text-xs text-stone-500">{shortDay(it.received_at)}</span> : null}
                      </td>
                    </tr>
                  ))}
                  {!items?.length && <tr><td colSpan={4} className="text-stone-500">No items.</td></tr>}
                </tbody>
              </table>
            </div>
            <p className="hint mt-2">Weights over 50 lb add the overweight fee automatically (open charge).</p>
          </section>

          <section className="panel">
            <h2 className="h3">Charges</h2>
            <table className="tbl mt-3">
              <thead><tr><th>Description</th><th>Status</th><th className="text-right">Amount</th><th /></tr></thead>
              <tbody>
                {(charges ?? []).map((c) => (
                  <tr key={c.id}>
                    <td>{c.description}<span className="block text-xs text-stone-500">{c.payment_method ?? '—'}{c.card_fee_cents ? ` · incl. ${money(c.card_fee_cents)} card price difference` : ''}</span></td>
                    <td className="capitalize">{c.status}</td>
                    <td className="text-right">{money(c.amount_cents)}{c.refunded_cents ? <span className="block text-xs text-ok">−{money(c.refunded_cents)}</span> : null}</td>
                    <td>
                      {c.status === 'paid' && c.stripe_payment_intent_id && (
                        <form action={refundCharge} className="flex gap-1">
                          <input type="hidden" name="charge_id" value={c.id} />
                          <input name="amount" placeholder="$ all" className="input min-h-9 w-20 px-2 py-1" aria-label="Refund amount" />
                          <button className="btn-outline btn-sm">Refund</button>
                        </form>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <form action={addCharge} className="mt-5 grid gap-2 border-t border-stone-100 pt-4 sm:grid-cols-[1fr_110px]">
              <input type="hidden" name="order_id" value={o.id} />
              <select name="fee_code" className="input sm:col-span-2" defaultValue="" aria-label="Fee type">
                <option value="">Custom charge</option>
                {(fees ?? []).map((f) => <option key={f.code} value={f.code}>{f.name}: {money(f.amount_cents)}{f.unit !== 'flat' ? ` ${f.unit.replace('_', ' ')}` : ''}</option>)}
              </select>
              <input name="description" placeholder="Description (shown to customer)" required className="input" />
              <input name="amount" placeholder="$ (bank price)" required inputMode="decimal" className="input" />
              <label className="flex items-center gap-2 text-sm sm:col-span-2"><input type="checkbox" name="charge_now" className="h-4 w-4 accent-ink-900" disabled={!acct.stripe_customer_id} />Charge saved payment method now{!acct.stripe_customer_id && ' (none on file)'}</label>
              <button className="btn-dark btn-sm sm:col-span-2 sm:justify-self-start">Add charge</button>
            </form>
          </section>
        </div>

        <aside className="space-y-6">
          <form action={updateOrder} className="panel space-y-3">
            <h2 className="h3">Status</h2>
            <input type="hidden" name="id" value={o.id} />
            <select name="status" defaultValue={o.status} className="input" aria-label="Order status">
              {[...orderStatusSteps.map((x) => x.status), 'pending_payment', 'cancelled'].map((s) => <option key={s} value={s}>{orderStatusLabel(s)}</option>)}
            </select>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="delivery_hold" defaultChecked={o.delivery_hold} className="h-4 w-4 accent-ink-900" />Delivery hold (unpaid)</label>
            <label className="label" htmlFor="notes">Internal notes</label>
            <textarea id="notes" name="notes" rows={4} defaultValue={o.notes ?? ''} className="input" />
            <button className="btn-dark btn-sm">Save</button>
          </form>
          <section className="panel text-sm">
            <h2 className="h3">Appointments</h2>
            <ul className="mt-2 space-y-2">
              {(appts ?? []).map((a) => <li key={a.id}><strong className="capitalize">{a.kind.replace('_', ' ')}</strong>: {a.date ? shortDay(a.date) : 'TBD'} {a.window_label}<br />{(a.locations as { name: string } | null)?.name ?? a.hall ?? a.address} · {a.status}</li>)}
              {!appts?.length && <li className="text-stone-500">None.</li>}
            </ul>
          </section>
          <section className="panel space-y-1 text-sm text-stone-700">
            <h2 className="h3 mb-2">Details</h2>
            <p>Return: {o.return_method} {o.return_hall ?? ''} {o.return_address ?? ''}</p>
            <p>Coverage: ${(o.declared_value_cents / 100).toLocaleString()}</p>
            {o.proxy_name && <p>Proxy: {o.proxy_name} {o.proxy_phone}</p>}
            {o.early_withdrawal && <p className="font-semibold">Early withdrawal</p>}
            {o.promo_code && <p>Promo: {o.promo_code}</p>}
            <p>Student: {o.student_email} {o.student_phone} {o.student_school_id}</p>
          </section>
        </aside>
      </div>
    </>
  )
}
