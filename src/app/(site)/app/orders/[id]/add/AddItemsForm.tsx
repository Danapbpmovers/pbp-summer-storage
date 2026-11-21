'use client'
import { useMemo, useState } from 'react'
import { payments } from '@/config/site'
import { money } from '@/lib/format'
import { applyPaymentMethod, quote, type PayMethod } from '@/lib/pricing'
import type { CampusData } from '@/lib/types'
import { CartSummary, ItemPicker, PayMethodToggle, Stepper } from '@/components/cart'

export default function AddItemsForm({ orderId, service, data }: { orderId: string; service: 'storage' | 'ship_ahead'; data: CampusData }) {
  const [items, setItems] = useState<Record<string, number>>({})
  const [shipAhead, setShipAhead] = useState(0)
  const [oversize, setOversize] = useState(0)
  const [method, setMethod] = useState<PayMethod>(payments.defaultMethod)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const q = useMemo(() => quote(data, {
    service, items, ship_ahead_count: shipAhead, ship_ahead_oversize: oversize,
    declared_value_cents: data.insurance.included_cents, dropoff_method: 'undecided', dropoff_date: null, return_method: 'undecided',
  }), [data, service, items, shipAhead, oversize])
  const pay = applyPaymentMethod(q, method, payments)

  const submit = async () => {
    setBusy(true); setErr('')
    const r = await fetch('/api/orders/add-items', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ orderId, items, ship_ahead_count: shipAhead, ship_ahead_oversize: oversize, method }) })
    const j = await r.json().catch(() => ({}))
    if (r.ok && j.redirect) window.location.href = j.redirect
    else { setErr(j.error ?? 'Something went wrong.'); setBusy(false) }
  }

  return (
    <div className="grid gap-8 pb-28 lg:grid-cols-[1fr_360px] lg:pb-0">
      <div className="space-y-6">
        {service === 'ship_ahead' && (
          <div className="panel max-w-lg space-y-5">
            <div className="flex items-center justify-between gap-4"><span className="font-semibold">More boxes / items you’ll ship to us</span><Stepper label="Ship Ahead items" value={shipAhead} onChange={(v) => { setShipAhead(v); setOversize((o) => Math.min(o, v)) }} /></div>
            <div className="flex items-center justify-between gap-4"><span>Of those, over 50 lb or larger than 20×20×20 in</span><Stepper label="Oversize items" value={oversize} onChange={(v) => setOversize(Math.min(v, shipAhead))} /></div>
          </div>
        )}
        {data.catalog.length > 0 && <ItemPicker catalog={data.catalog} items={items} setQty={(id, n) => setItems((s) => ({ ...s, [id]: n }))} />}
      </div>
      <aside className="lg:sticky lg:top-24 lg:self-start">
        <CartSummary quote={q} method={method} title="Adding to your order">
          <PayMethodToggle method={method} setMethod={setMethod} quote={q} />
          {err && <p role="alert" className="mt-3 text-sm font-semibold text-red-700">{err}</p>}
          <button type="button" className="btn-primary mt-4 w-full" disabled={busy || q.item_count + q.lines.filter((l) => l.kind === 'supply').length === 0} onClick={submit}>
            {busy ? 'Working…' : `Pay ${money(pay.total_cents)}${method === 'ach' ? ' by bank (ACH discount)' : ' by card'}`}
          </button>
          <p className="mt-2 text-center text-xs text-stone-500">Coverage and drop-off stay as they are on your order.</p>
        </CartSummary>
      </aside>
    </div>
  )
}
