import type { Metadata } from 'next'
import Link from 'next/link'
import { cardPrice, priceText } from '@/config/site'
import { defaultCampusSlug, getCampusData, listCampuses } from '@/lib/campus'
import { money } from '@/lib/format'
import { categoryLabels } from '@/lib/types'
import PricingCalculator from '@/components/PricingCalculator'
import { PageHero, campusDates } from '@/components/ui'

export const revalidate = 300
export const metadata: Metadata = {
  title: 'Pricing – per-item student storage',
  description: 'Per-item summer storage prices for Boston students: boxes, bags, fridges, furniture and more. Up to 4 months and $300 coverage included. Every fee listed.',
  alternates: { canonical: '/pricing' },
}

const unitLabel = { flat: '', per_item: ' per item', per_lb: ' per lb' } as const

export default async function PricingPage({ searchParams }: { searchParams: Promise<{ campus?: string }> }) {
  const { campus: slug = defaultCampusSlug } = await searchParams
  const [campuses, data] = await Promise.all([listCampuses(), getCampusData(slug)])
  const d = data ?? (await getCampusData(defaultCampusSlug))!
  const dates = campusDates(d)
  const hasCatalog = d.catalog.length > 0

  return (
    <>
      <PageHero eyebrow="Pricing" title="Simple per-item pricing" intro={`Each price covers up to 4 months of storage and includes $${d.insurance.included_cents / 100} of coverage per order. No early-withdrawal fee.`}>
        <form className="flex flex-wrap items-end gap-3" action="/pricing">
          <div>
            <label htmlFor="campus" className="label">School</label>
            <select id="campus" name="campus" defaultValue={d.campus.slug} className="input min-w-64">
              {campuses.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
            </select>
          </div>
          <button className="btn-outline">Show prices</button>
        </form>
      </PageHero>

      <section className="wrap py-12 pb-28 lg:pb-12">
        <p className="mb-6 rounded-xl border border-ok/20 bg-green-50 px-4 py-3 text-sm text-green-900">
          <strong>Save with the ACH discount.</strong> Pay by bank transfer (ACH) and you pay the lower “With ACH” price on every item and fee.
        </p>
        {hasCatalog ? (
          <>
            <h2 className="h2 mb-2">Estimate your cost</h2>
            <p className="mb-8 text-stone-600">Add what you’re storing to see your total. You’ll pay for what we actually store, and any difference at drop-off is itemized in your account.</p>
            <PricingCalculator data={d} />
          </>
        ) : (
          <div className="card max-w-2xl">
            <h2 className="h3">Pricing for {d.campus.name} is coming soon</h2>
            <p className="mt-2 text-stone-600">We’re still setting up this campus. <Link href="/contact" className="font-semibold text-pbp-700 underline">Contact us</Link> for a quote.</p>
          </div>
        )}
      </section>

      {hasCatalog && (
        <section className="border-t border-stone-200 bg-sand-50 py-16" id="full-list">
          <div className="wrap">
            <h2 className="h2">Full price list</h2>
            <div className="mt-8 grid gap-6 md:grid-cols-2">
              {Object.entries(categoryLabels).map(([cat, label]) => {
                const rows = d.catalog.filter((i) => i.category === cat)
                if (!rows.length) return null
                return (
                  <div key={cat} className="card p-0">
                    <h3 className="h3 border-b border-stone-100 px-5 py-3">{label}</h3>
                    <table className="tbl">
                      <thead><tr><th>Item</th><th className="text-right">Price</th><th className="text-right">With ACH</th></tr></thead>
                      <tbody>
                        {rows.map((i) => (
                          <tr key={i.id}><td>{i.name}{i.note && <span className="block text-xs text-stone-500">{i.note}</span>}</td><td className="text-right font-semibold">{money(cardPrice(i.price_cents))}</td><td className="text-right font-semibold text-ok">{money(i.price_cents)}</td></tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )
              })}
            </div>
          </div>
        </section>
      )}

      <section className="wrap py-16" id="fees">
        <h2 className="h2">Fees & add-ons</h2>
        <p className="mt-2 max-w-2xl text-stone-600">
          Curbside pickup is free on peak move-out dates ({dates.peakMoveOut}). On-campus delivery is free during peak move-in ({dates.peakMoveIn}), 9am–5pm.
        </p>
        <div className="mt-8 grid gap-8 lg:grid-cols-[1.4fr_1fr]">
          <div className="card p-0">
            <table className="tbl">
              <thead><tr><th>Fee</th><th className="text-right">Price</th><th className="text-right">With ACH</th></tr></thead>
              <tbody>
                {d.fees.map((f) => (
                  <tr key={f.code}><td>{f.name}{f.note && <span className="block text-xs text-stone-500">{f.note}</span>}</td><td className="whitespace-nowrap text-right font-semibold">{money(cardPrice(f.amount_cents))}{unitLabel[f.unit]}</td><td className="whitespace-nowrap text-right font-semibold text-ok">{money(f.amount_cents)}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="space-y-5">
            <div className="card">
              <h3 className="h3">Coverage</h3>
              <ul className="mt-3 space-y-2 text-stone-700">
                <li>${d.insurance.included_cents / 100} of declared value is included with every order.</li>
                <li>Add more at {priceText(d.insurance.addon_cents_per_100)} per $100.</li>
                {d.insurance.max_per_box_cents && <li>Up to ${d.insurance.max_per_box_cents / 100} per box and ${(d.insurance.max_per_order_cents ?? 0) / 100} per order.</li>}
                <li>Report damage within {d.insurance.claim_window_days} days of delivery.</li>
              </ul>
            </div>
            <div className="card">
              <h3 className="h3">Paying</h3>
              <ul className="mt-3 space-y-2 text-stone-700">
                <li>Pay online when you book, by bank transfer (ACH) or card.</li>
                <li>Paying by bank transfer gets the ACH discount: you pay the lower “With ACH” price.</li>
                <li>We save your payment method for anything added later, and every charge is itemized in your account.</li>
              </ul>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
