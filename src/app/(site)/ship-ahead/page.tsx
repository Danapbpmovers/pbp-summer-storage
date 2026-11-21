import type { Metadata } from 'next'
import Link from 'next/link'
import { brand, warehouse } from '@/config/site'
import { defaultCampusSlug, getCampusData } from '@/lib/campus'
import { money } from '@/lib/format'
import { CtaBand, PageHero, campusDates } from '@/components/ui'

export const revalidate = 300
export const metadata: Metadata = {
  title: 'Ship Ahead to Boston University',
  description: 'Ship your boxes to our warehouse before you arrive in Boston. We receive them, store them for up to a month and deliver when you get to campus.',
  alternates: { canonical: '/ship-ahead' },
}

export default async function ShipAhead() {
  const d = (await getCampusData(defaultCampusSlug))!
  const dates = campusDates(d)
  const fee = d.fees.find((f) => f.code === 'ship_ahead')
  const over = d.fees.find((f) => f.code === 'ship_ahead_oversize')
  return (
    <>
      <PageHero eyebrow="Ship Ahead" title="Arrive in Boston to everything already waiting"
        intro={`Ship your boxes to our warehouse before you arrive. We receive them, store them for up to a month and deliver when you get to campus${fee ? `, for ${money(fee.amount_cents)} per item` : ''}.`}>
        <Link href={`/book?campus=${d.campus.slug}&service=ship_ahead`} className="btn-primary">Start a Ship Ahead order</Link>
      </PageHero>
      <section className="wrap grid gap-10 py-14 lg:grid-cols-[1.4fr_1fr]">
        <div className="prose-site">
          <h2>How it works</h2>
          <ol>
            <li><strong>Create an account and book Ship Ahead.</strong> Tell us how many items you’re sending.</li>
            <li><strong>Label each box.</strong> Write your name and phone number in two places on every box.</li>
            <li><strong>Ship to our warehouse</strong> with any carrier (usually UPS). You pay the shipping cost. Ship at least two weeks before you arrive, and send us the tracking numbers.</li>
            <li><strong>We receive and store your boxes.</strong> We’ll email when everything has arrived, and you can see it in your account.</li>
            <li><strong>Request delivery</strong> in your account. We’ll confirm the date, time and where to pick up when you arrive.</li>
          </ol>
          <h2>Deadline</h2>
          <p>For the fall semester, items must reach the warehouse <strong>by {dates.shipAheadArrival}</strong> for delivery during move-in. At other times of year, they must arrive 7 days before your requested delivery date.</p>
          <h2>Pricing</h2>
          <ul>
            {fee && <li>{money(fee.amount_cents)} per item. That includes receiving, up to one month of storage and weekday curbside delivery.</li>}
            {over && <li>{money(over.amount_cents)} extra per item over 50 lb or larger than 20×20×20 in.</li>}
          </ul>
        </div>
        <aside className="lg:pt-10">
          <div className="card bg-sand-50">
            <h2 className="h3">Ship to</h2>
            <p className="mt-3 font-mono text-[15px] leading-relaxed text-ink-900">
              {brand.ups ? 'The UPS Store Student Storage Program' : brand.name}<br />C/O BU – (Your Name)<br />{warehouse.street}<br />{warehouse.city}, {warehouse.state} {warehouse.zip}
            </p>
            <p className="hint mt-4">Replace “BU” with your school if you’re not at BU.</p>
          </div>
        </aside>
      </section>
      <CtaBand title="Coming to Boston this fall?" href={`/book?campus=${d.campus.slug}&service=ship_ahead`} cta="Start Ship Ahead" />
    </>
  )
}
