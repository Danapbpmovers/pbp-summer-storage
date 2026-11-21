'use client'
import Link from 'next/link'
import { useMemo, useState } from 'react'
import { payments } from '@/config/site'
import { applyPaymentMethod, quote } from '@/lib/pricing'
import { money } from '@/lib/format'
import type { CampusData } from '@/lib/types'
import { CartSummary, CoverageInput, ItemPicker, PayMethodToggle } from './cart'

export default function PricingCalculator({ data }: { data: CampusData }) {
  const [items, setItems] = useState<Record<string, number>>({})
  const [declared, setDeclared] = useState(data.insurance.included_cents)
  const [method, setMethod] = useState(payments.defaultMethod)
  const q = useMemo(
    () => quote(data, { service: 'storage', items, ship_ahead_count: 0, ship_ahead_oversize: 0, declared_value_cents: declared, dropoff_method: 'station', dropoff_date: null, return_method: 'on_campus' }),
    [data, items, declared],
  )
  const bookHref = `/book?campus=${data.campus.slug}&items=${encodeURIComponent(Object.entries(items).filter(([, n]) => n > 0).map(([id, n]) => `${id}:${n}`).join(','))}`

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
      <div>
        <ItemPicker catalog={data.catalog} items={items} setQty={(id, n) => setItems((s) => ({ ...s, [id]: n }))} />
        <div className="mt-8 max-w-md rounded-xl border border-stone-200 bg-sand-50 p-5">
          <h3 className="h3 mb-3">Coverage</h3>
          <CoverageInput value={declared} onChange={setDeclared} includedCents={data.insurance.included_cents} maxCents={data.insurance.max_per_order_cents} />
          <p className="hint">${data.insurance.addon_cents_per_100 / 100} per extra $100 of declared value.</p>
        </div>
      </div>
      <div className="lg:sticky lg:top-24 lg:self-start">
        <CartSummary quote={q} method={method}>
          <PayMethodToggle method={method} setMethod={setMethod} actualCents={q.due_now_cents} />
          <Link href={bookHref} className="btn-primary mt-4 w-full">Book these items</Link>
          <p className="mt-2 text-center text-xs text-stone-500">Prices are per item and cover up to 4 months.</p>
        </CartSummary>
      </div>
      {/* Sticky mobile total */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-stone-200 bg-white/95 px-4 py-3 backdrop-blur lg:hidden">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs text-stone-500">{q.item_count} items · {method === 'ach' ? 'bank transfer' : 'card'}</p>
            <p className="text-lg font-extrabold text-ink-900">
              {money(applyPaymentMethod(q.due_now_cents, method, payments).total_cents)}
            </p>
          </div>
          <Link href={bookHref} className="btn-primary">Book</Link>
        </div>
      </div>
    </div>
  )
}
