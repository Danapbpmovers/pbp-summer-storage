import Link from 'next/link'
import { notFound } from 'next/navigation'
import { serverClient } from '@/lib/supabase/server'
import { getCampusData } from '@/lib/campus'
import { day, money, shortDay } from '@/lib/format'
import { orderStatusLabel, orderStatusSteps } from '@/lib/types'
import { PayButtons, DeliveryRequestForm, ClaimForm } from '@/components/portal'
import { signPhotos } from '@/lib/photos'
import { ADDABLE_STATUSES } from '@/lib/orders'
import { ClaimKind } from '@/components/ClaimKind'

export default async function OrderPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ paid?: string; pending?: string; cancelled?: string; requested?: string; added?: string }> }) {
  const [{ id }, sp, sb] = await Promise.all([params, searchParams, serverClient()])
  const { data: o } = await sb!.from('orders').select('*, campuses(slug, name, short_name)').eq('id', id).maybeSingle()
  if (!o) notFound()
  const campus = o.campuses as { slug: string; name: string; short_name: string }
  const [{ data: items }, { data: charges }, { data: appts }, { data: claims }, data] = await Promise.all([
    sb!.from('order_items').select('*').eq('order_id', id).order('created_at'),
    sb!.from('charges').select('*').eq('order_id', id).order('created_at'),
    sb!.from('appointments').select('*, locations(name)').eq('order_id', id).order('created_at'),
    sb!.from('claims').select('*').eq('order_id', id).order('created_at'),
    getCampusData(campus.slug),
  ])
  const photoUrls = await signPhotos(sb!, 'intake-photos', (items ?? []).flatMap((it) => it.photos ?? []))
  const claimWindowDays = data?.insurance.claim_window_days ?? 3
  const deliveredAt = o.delivered_at ? new Date(o.delivered_at) : null
  const claimDeadline = deliveredAt ? new Date(deliveredAt.getTime() + claimWindowDays * 86400000) : null
  const canClaim = ['out_for_delivery', 'completed'].includes(o.status) && (!claimDeadline || claimDeadline >= new Date())
  const stepIdx = orderStatusSteps.findIndex((x) => x.status === o.status)
  const deadline = data?.calendar.find((c) => c.key === (o.return_method === 'off_campus' ? 'offcampus_request_deadline' : 'delivery_request_deadline'))
  const delivery = appts?.find((a) => a.kind === 'delivery' && a.status !== 'cancelled')
  const dropoff = appts?.find((a) => a.kind !== 'delivery')
  const canRequestDelivery = !delivery && ['confirmed', 'scheduled', 'received', 'in_storage'].includes(o.status)

  return (
    <>
      <Link href="/app" className="no-print text-sm font-semibold text-pbp-700">← All orders</Link>
      <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-stone-500">Order #{o.order_number} · {campus.name} · {o.season}</p>
          <h1 className="h2">{o.service === 'storage' ? 'Summer storage' : 'Ship Ahead'} for {o.student_first_name} {o.student_last_name}</h1>
        </div>
        <span className="badge bg-ink-900 px-3 py-1 text-sm text-white">{orderStatusLabel(o.status)}</span>
      </div>

      {sp.added && <p role="status" className="mt-5 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-green-900">Items added. Print labels for the new items below.</p>}
      {sp.paid && <p role="status" className="mt-5 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-green-900">Thank you, your payment was received. Bank transfers can take a few days to clear.</p>}
      {sp.pending && <p role="status" className="mt-5 rounded-xl border border-gold-500/40 bg-gold-100 px-4 py-3 text-ink-900">Your booking is saved. We’ll email a payment link shortly.</p>}
      {sp.cancelled && <p role="status" className="mt-5 rounded-xl border border-gold-500/40 bg-gold-100 px-4 py-3 text-ink-900">Payment wasn’t finished. You can pay below.</p>}
      {sp.requested && <p role="status" className="mt-5 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-green-900">Delivery requested. We’ll email you a confirmation.</p>}
      {o.delivery_hold && <p className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-800">Delivery is on hold until the balance below is paid.</p>}

      {/* Timeline */}
      <ol className="mt-8 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-8" aria-label="Order progress">
        {orderStatusSteps.map((x, i) => (
          <li key={x.status} className={`rounded-lg border px-3 py-2 text-xs font-semibold ${i <= stepIdx ? 'border-ink-900 bg-ink-900 text-white' : 'border-stone-200 bg-white text-stone-500'}`} aria-current={i === stepIdx ? 'step' : undefined}>
            {x.label}
          </li>
        ))}
      </ol>

      <div className="mt-10 grid gap-8 lg:grid-cols-[1.5fr_1fr]">
        <section aria-labelledby="items">
          <div className="flex items-center justify-between">
            <h2 id="items" className="h3 text-xl">Items ({items?.length ?? 0})</h2>
            <span className="flex gap-2">
              {ADDABLE_STATUSES.includes(o.status) && <Link href={`/app/orders/${id}/add`} className="btn-primary btn-sm">Add items</Link>}
              {!!items?.length && <Link href={`/app/orders/${id}/labels`} className="btn-outline btn-sm">Print labels</Link>}
            </span>
          </div>
          {!items?.length ? (
            <p className="mt-3 text-stone-600">No items yet.</p>
          ) : (
            <div className="mt-3 overflow-x-auto rounded-xl border border-stone-200 bg-white">
              <table className="tbl">
                <thead><tr><th>Label</th><th>Item</th><th>Status</th><th>Photos</th></tr></thead>
                <tbody>
                  {items.map((it) => (
                    <tr key={it.id}>
                      <td className="font-mono text-xs">{it.label_code}</td>
                      <td>{it.actual_name ?? it.name}{it.weight_lbs ? <span className="block text-xs text-stone-500">{it.weight_lbs} lb</span> : null}</td>
                      <td className="capitalize">{String(it.status).replace('_', ' ')}</td>
                      <td>
                        {it.photos?.length ? (
                          <span className="flex gap-1">
                            {(it.photos as string[]).slice(0, 3).map((p) => photoUrls[p] && (
                              <a key={p} href={photoUrls[p]} target="_blank" rel="noreferrer"><img src={photoUrls[p]} alt={`Intake photo of ${it.name}`} className="h-12 w-12 rounded-md object-cover" /></a>
                            ))}
                          </span>
                        ) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <h2 id="billing" className="h3 mt-10 text-xl">Charges</h2>
          <div className="mt-3 overflow-x-auto rounded-xl border border-stone-200 bg-white">
            <table className="tbl">
              <thead><tr><th>Date</th><th>Description</th><th>Status</th><th className="text-right">Amount</th></tr></thead>
              <tbody>
                {(charges ?? []).map((c) => (
                  <tr key={c.id}>
                    <td className="whitespace-nowrap">{shortDay(c.created_at)}</td>
                    <td>{c.description}<span className="block text-xs text-stone-500">{c.payment_method === 'card' ? 'Card' : c.payment_method === 'ach' ? 'Bank transfer, ACH discount applied' : ''}</span></td>
                    <td className="capitalize">{c.status}</td>
                    <td className="text-right font-semibold">{money(c.amount_cents)}{c.refunded_cents ? <span className="block text-xs text-ok">−{money(c.refunded_cents)} refunded</span> : null}</td>
                  </tr>
                ))}
                {!charges?.length && <tr><td colSpan={4} className="text-stone-500">No charges yet.</td></tr>}
              </tbody>
            </table>
          </div>
          {(charges ?? []).filter((c) => c.status === 'open' || c.status === 'failed').map((c) => (
            <PayButtons key={c.id} chargeId={c.id} description={c.description} amountCents={c.amount_cents} method={c.payment_method ?? 'ach'} cardFeeCents={c.card_fee_cents ?? 0} />
          ))}

          {(canClaim || !!claims?.length) && (
            <div id="claims">
              <h2 className="h3 mt-10 text-xl">Damage or loss</h2>
              {!!claims?.length && (
                <ul className="mt-3 space-y-2">
                  {claims.map((c) => (
                    <li key={c.id} className="panel">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <ClaimKind kind={c.kind} />
                          <p className="mt-1.5 font-semibold text-ink-900">{c.description}</p>
                        </div>
                        <span className="badge shrink-0 bg-sand-100 capitalize text-ink-800">{c.status}</span>
                      </div>
                      <p className="mt-1 text-sm text-stone-600">Filed {shortDay(c.created_at)}{c.amount_claimed_cents ? ` · claimed ${money(c.amount_claimed_cents)}` : ''}{c.approved_cents != null ? ` · approved ${money(c.approved_cents)}` : ''}</p>
                      {c.resolution && <p className="mt-2 text-sm text-stone-700">{c.resolution}</p>}
                    </li>
                  ))}
                </ul>
              )}
              {canClaim && (
                <ClaimForm orderId={id} items={(items ?? []).map((it) => ({ id: it.id, label: `${it.label_code} · ${it.actual_name ?? it.name}` }))}
                  deadline={claimDeadline ? day(claimDeadline.toISOString().slice(0, 10)) : null} windowDays={claimWindowDays} />
              )}
            </div>
          )}
        </section>

        <aside className="space-y-5">
          <div className="panel">
            <h2 className="h3">Drop-off</h2>
            {dropoff ? (
              <p className="mt-2 text-stone-700">{dropoff.kind === 'station_dropoff' ? `Station: ${(dropoff.locations as { name: string } | null)?.name ?? ''}` : `Curbside: ${dropoff.address}`}<br />{dropoff.date ? shortDay(dropoff.date) : ''} {dropoff.window_label}</p>
            ) : <p className="mt-2 text-stone-600">{o.service === 'ship_ahead' ? 'Ship your boxes to the warehouse.' : 'Not scheduled yet. You can also just bring items to any station during move-out week.'}</p>}
          </div>
          <div className="panel">
            <h2 className="h3">Fall return</h2>
            {delivery ? (
              <p className="mt-2 text-stone-700">Requested for {delivery.date ? shortDay(delivery.date) : 'TBD'} {delivery.window_label}<br />{delivery.hall ?? delivery.address}<br /><span className="text-sm capitalize text-stone-500">{delivery.status}</span></p>
            ) : (
              <>
                <p className="mt-2 text-stone-600">{{ on_campus: 'Move-In Station on campus', off_campus: 'Off-campus delivery', ship: 'Ship to you', extended: 'Extended storage', undecided: 'Not chosen yet' }[o.return_method as string]}{deadline ? `. Request by ${day(deadline.starts_on)}.` : '.'}</p>
                {canRequestDelivery && <DeliveryRequestForm orderId={id} method={o.return_method} hall={o.return_hall ?? ''} address={o.return_address ?? ''} window={data?.calendar.find((c) => c.key === 'fall_delivery_window') ?? null} />}
              </>
            )}
          </div>
          <div className="panel text-sm text-stone-600">
            <p>Coverage: ${(o.declared_value_cents / 100).toLocaleString()} declared value</p>
            {o.proxy_name && <p className="mt-1">Proxy: {o.proxy_name} {o.proxy_phone}</p>}
            {o.early_withdrawal && <p className="mt-1">Marked for early withdrawal</p>}
          </div>
        </aside>
      </div>
    </>
  )
}
