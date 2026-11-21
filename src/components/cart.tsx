'use client'
import { useMemo, useState } from 'react'
import { cardPrice, payments } from '@/config/site'
import { money } from '@/lib/format'
import { applyPaymentMethod, type PayMethod, type Quote } from '@/lib/pricing'
import { categoryLabels, type CatalogItem, type ItemCategory } from '@/lib/types'

export function Stepper({ value, onChange, label }: { value: number; onChange: (n: number) => void; label: string }) {
  return (
    <div className="flex items-center gap-1" role="group" aria-label={`Quantity for ${label}`}>
      <button type="button" className="flex h-9 w-9 items-center justify-center rounded-lg border border-stone-300 text-lg font-bold text-stone-700 hover:bg-stone-50 disabled:opacity-30"
        onClick={() => onChange(Math.max(0, value - 1))} disabled={value === 0} aria-label={`Remove one ${label}`}>−</button>
      <input inputMode="numeric" className="h-9 w-11 rounded-lg border border-stone-300 text-center text-[15px] font-semibold" value={value}
        aria-label={`${label} quantity`}
        onChange={(e) => onChange(Math.max(0, Math.min(99, parseInt(e.target.value.replace(/\D/g, '') || '0', 10))))} />
      <button type="button" className="flex h-9 w-9 items-center justify-center rounded-lg border border-stone-300 text-lg font-bold text-stone-700 hover:bg-stone-50"
        onClick={() => onChange(Math.min(99, value + 1))} aria-label={`Add one ${label}`}>+</button>
    </div>
  )
}

const icons: Record<ItemCategory, string> = {
  boxes: 'M4 8l8-4 8 4v8l-8 4-8-4zM4 8l8 4 8-4M12 12v8',
  bags: 'M6 8h12l-1 12H7zM9 8V6a3 3 0 0 1 6 0v2',
  bins: 'M4 7h16v4H4zM5 11h14v8H5zM10 14h4',
  appliances: 'M7 3h10v18H7zM7 10h10M10 6v2M10 13v3',
  furniture: 'M5 11h14v5H5zM6 16v4M18 16v4M7 11V7h10v4',
  oversized: 'M3 10h18v6H3zM5 16v3M19 16v3M3 10V8h18v2',
  sports: 'M5 19l14-14M8 5a3 3 0 1 1 0 6M16 13a3 3 0 1 1 0 6',
}

export function ItemPicker({ catalog, items, setQty }: { catalog: CatalogItem[]; items: Record<string, number>; setQty: (id: string, n: number) => void }) {
  const cats = useMemo(() => Array.from(new Set(catalog.map((c) => c.category))), [catalog])
  const [cat, setCat] = useState<ItemCategory | 'all'>('all')
  const [q, setQ] = useState('')
  const shown = catalog.filter((i) => (cat === 'all' || i.category === cat) && (!q || i.name.toLowerCase().includes(q.toLowerCase())))
  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <label className="sr-only" htmlFor="item-search">Search items</label>
        <input id="item-search" className="input sm:max-w-xs" placeholder="Search items (e.g. fridge)" value={q} onChange={(e) => setQ(e.target.value)} />
        <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1" role="tablist" aria-label="Item categories">
          {(['all', ...cats] as const).map((c) => (
            <button key={c} type="button" role="tab" aria-selected={cat === c} onClick={() => setCat(c)}
              className={`shrink-0 rounded-full border px-3.5 py-1.5 text-sm font-semibold ${cat === c ? 'border-ink-900 bg-ink-900 text-white' : 'border-stone-300 bg-white text-stone-700 hover:border-stone-400'}`}>
              {c === 'all' ? 'All' : categoryLabels[c]}
            </button>
          ))}
        </div>
      </div>
      <ul className="mt-4 grid gap-2.5 sm:grid-cols-2">
        {shown.map((i) => {
          const n = items[i.id] ?? 0
          return (
            <li key={i.id} className={`flex items-center gap-3 rounded-xl border p-3 transition ${n ? 'border-gold-500 bg-gold-100/40' : 'border-stone-200 bg-white'}`}>
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-sand-100" aria-hidden>
                <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="#5e3c2d" strokeWidth="1.7" strokeLinejoin="round" strokeLinecap="round"><path d={icons[i.category] ?? icons.boxes} /></svg>
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] font-semibold leading-snug text-ink-900">{i.name}</span>
                <span className="block text-sm text-stone-600">{money(i.price_cents)} <span className="text-stone-400">· card {money(cardPrice(i.price_cents))}</span>{i.note ? <span className="text-stone-500"> · {i.note}</span> : null}</span>
              </span>
              <Stepper value={n} onChange={(v) => setQty(i.id, v)} label={i.name} />
            </li>
          )
        })}
        {shown.length === 0 && <li className="text-stone-500">No items match. Not listed? Add a note at the end and we’ll quote it.</li>}
      </ul>
    </div>
  )
}

export function PayMethodToggle({ method, setMethod, actualCents }: { method: PayMethod; setMethod: (m: PayMethod) => void; actualCents: number }) {
  const p = applyPaymentMethod(actualCents, 'ach', payments)
  const opts: { id: PayMethod; t: string; amount: number }[] = [
    { id: 'ach', t: 'Bank transfer (ACH)', amount: p.ach_cents },
    { id: 'card', t: 'Credit / debit card', amount: p.card_cents },
  ]
  return (
    <fieldset>
      <legend className="label">Pay with</legend>
      <div className="grid grid-cols-2 gap-2">
        {opts.map((o) => (
          <label key={o.id} className={`cursor-pointer rounded-xl border p-3 text-sm ${method === o.id ? 'border-ink-900 bg-sand-50 ring-1 ring-ink-900' : 'border-stone-300 bg-white'}`}>
            <input type="radio" name="paymethod" className="sr-only" checked={method === o.id} onChange={() => setMethod(o.id)} />
            <span className="block font-semibold text-ink-900">{o.t}</span>
            <span className="block text-stone-600">{money(o.amount)}</span>
          </label>
        ))}
      </div>
      <p className="hint">Card payments are {payments.cardFeePercent}% higher.</p>
    </fieldset>
  )
}

export function CartSummary({ quote, method, title = 'Your estimate', children, compact = false }: {
  quote: Quote; method: PayMethod; title?: string; children?: React.ReactNode; compact?: boolean
}) {
  const pay = applyPaymentMethod(quote.due_now_cents, method, payments)
  const visible = compact ? quote.lines.slice(-4) : quote.lines
  return (
    <div className="rounded-2xl border border-stone-200 bg-white shadow-sm" aria-live="polite">
      <div className="flex items-center justify-between border-b border-stone-100 px-5 py-4">
        <h2 className="font-bold text-ink-900">{title}</h2>
        <span className="text-sm text-stone-500">{quote.item_count} item{quote.item_count === 1 ? '' : 's'}</span>
      </div>
      <div className="px-5 py-3">
        {quote.lines.length === 0 ? (
          <p className="py-4 text-sm text-stone-500">Add items to see your total.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {compact && quote.lines.length > 4 && <li className="text-stone-500">+ {quote.lines.length - 4} more…</li>}
            {visible.map((l, i) => (
              <li key={i} className="flex justify-between gap-3">
                <span className="text-stone-700">{l.label}{l.qty > 1 ? <span className="text-stone-400"> × {l.qty}</span> : null}</span>
                <span className={`shrink-0 font-semibold ${l.total_cents < 0 ? 'text-ok' : ''}`}>{money(l.total_cents)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="flex items-baseline justify-between border-t border-stone-100 px-5 py-4">
        <span className="font-semibold text-stone-700">Due today <span className="block text-xs font-normal text-stone-500">{method === 'ach' ? 'Bank transfer' : 'Card'}</span></span>
        <span className="text-2xl font-extrabold text-ink-900">{money(pay.total_cents)}</span>
      </div>
      {quote.later.length > 0 && (
        <ul className="border-t border-stone-100 px-5 py-3 text-xs text-stone-500">
          {quote.later.map((l) => <li key={l.label}>{l.label}{l.amount_cents ? `: ${money(l.amount_cents)}` : ''}</li>)}
        </ul>
      )}
      {quote.warnings.map((w) => <p key={w} className="px-5 pb-3 text-xs font-semibold text-warn">{w}</p>)}
      {children && <div className="border-t border-stone-100 p-4">{children}</div>}
    </div>
  )
}

export function CoverageInput({ value, onChange, includedCents, maxCents }: { value: number; onChange: (c: number) => void; includedCents: number; maxCents: number | null }) {
  const max = maxCents ?? 500000
  return (
    <div>
      <label htmlFor="coverage" className="label">Total declared value: <span className="text-ink-900">${(value / 100).toLocaleString()}</span></label>
      <input id="coverage" type="range" min={includedCents} max={max} step={10000} value={value} onChange={(e) => onChange(Number(e.target.value))} className="w-full accent-ink-900" />
      <div className="flex justify-between text-xs text-stone-500"><span>${includedCents / 100} included</span><span>${(max / 100).toLocaleString()} max</span></div>
    </div>
  )
}
