import Link from 'next/link'
import type { CampusData } from '@/lib/types'
import { day, range } from '@/lib/format'
import type { FaqItem } from '@/data/faq'

export function PageHero({ eyebrow, title, intro, children }: { eyebrow?: string; title: string; intro?: string; children?: React.ReactNode }) {
  return (
    <section className="border-b border-stone-200 bg-sand-50">
      <div className="wrap py-14 sm:py-20">
        {eyebrow && <p className="eyebrow mb-3">{eyebrow}</p>}
        <h1 className="h1 max-w-3xl">{title}</h1>
        {intro && <p className="mt-4 max-w-2xl text-lg text-stone-600">{intro}</p>}
        {children && <div className="mt-8">{children}</div>}
      </div>
    </section>
  )
}

export function Faq({ items }: { items: FaqItem[] }) {
  return (
    <div className="divide-y divide-stone-200 rounded-2xl border border-stone-200 bg-white">
      {items.map((f) => (
        <details key={f.q} className="group px-5 py-1 [&_summary::-webkit-details-marker]:hidden">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 text-[16px] font-semibold text-ink-900">
            {f.q}
            <svg className="h-5 w-5 shrink-0 text-stone-400 transition group-open:rotate-45" viewBox="0 0 20 20" fill="currentColor" aria-hidden><path d="M9 4h2v5h5v2h-5v5H9v-5H4V9h5z" /></svg>
          </summary>
          <p className="pb-5 text-stone-600">{f.a}</p>
        </details>
      ))}
    </div>
  )
}

export function CtaBand({ title, body, href = '/book', cta = 'Get started' }: { title: string; body?: string; href?: string; cta?: string }) {
  return (
    <section className="wrap py-16">
      <div className="flex flex-col items-start justify-between gap-6 rounded-[1.75rem] bg-ink-900 px-7 py-10 text-white sm:flex-row sm:items-center sm:px-12">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{title}</h2>
          {body && <p className="mt-2 max-w-xl text-white/70">{body}</p>}
        </div>
        <Link href={href} className="btn-primary shrink-0">{cta}</Link>
      </div>
    </section>
  )
}

/** Human-readable key dates for a campus, with safe fallbacks. */
export function campusDates(data: CampusData) {
  const get = (k: string) => data.calendar.find((c) => c.key === k)
  const fmt = (k: string, fallback: string) => {
    const c = get(k)
    return c ? (c.ends_on ? range(c.starts_on, c.ends_on) : day(c.starts_on)) : fallback
  }
  return {
    peakMoveOut: fmt('peak_move_out', 'early May'),
    stations: fmt('move_out_stations', 'move-out week'),
    deliveryDeadline: fmt('delivery_request_deadline', 'early August'),
    offcampusDeadline: fmt('offcampus_request_deadline', 'early August'),
    shipAheadArrival: fmt('ship_ahead_arrival', 'early August'),
    fallWindow: fmt('fall_delivery_window', 'late August to early September'),
    peakMoveIn: fmt('peak_move_in', 'late August'),
    earlyBefore: fmt('early_withdrawal_before', 'July 1'),
  }
}

export function Check() {
  return (
    <svg className="mt-0.5 h-5 w-5 shrink-0 text-ok" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
      <path fillRule="evenodd" d="M16.7 5.3a1 1 0 0 1 0 1.4l-8 8a1 1 0 0 1-1.4 0l-4-4a1 1 0 1 1 1.4-1.4L8 12.6l7.3-7.3a1 1 0 0 1 1.4 0Z" clipRule="evenodd" />
    </svg>
  )
}

export function NeedsOwner({ children }: { children: React.ReactNode }) {
  return <span className="badge bg-gold-100 text-ink-800" title="Needs owner confirmation">{children}</span>
}
