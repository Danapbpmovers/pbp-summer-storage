import type { Metadata } from 'next'
import { brand, operator } from '@/config/site'
import { CtaBand, PageHero } from '@/components/ui'

export const metadata: Metadata = {
  title: 'About us',
  description: 'Boston student storage and shipping since 1986, with a solar-powered warehouse and reusable storage bins.',
  alternates: { canonical: '/about' },
}

export default function About() {
  return (
    <>
      <PageHero eyebrow="About" title={`Boston student storage since ${brand.since}`} />
      <section className="wrap grid gap-12 py-14 lg:grid-cols-[1.5fr_1fr]">
        <div className="prose-site">
          <p>{brand.name} is the online home of {brand.ups ? 'The UPS Store Student Storage & Shipping Program' : 'our student storage and shipping program'} in Boston. We started serving Boston University students in {brand.since}, and today we help students across the Boston area with summer storage, shipping home and Ship Ahead.</p>
          <p>Having stores on or next to campus means we can offer real, in-person help at a fair price. Our moving partner, {brand.partner} ({brand.partnerLong}), helps run move-out stations, curbside pickups and fall deliveries.</p>
          <h2>Greener storage</h2>
          <p>In 2012 we introduced durable reusable storage bins as an alternative to cardboard. Since 2016 our warehouse has run on 100% solar power.</p>
          <h2>People you can reach</h2>
          <p>Questions go to our local team by email or phone, or in person at {operator} on Commonwealth Ave.</p>
        </div>
        <dl className="grid h-fit grid-cols-2 gap-4">
          {[[String(brand.since), 'Serving BU students since'], ['2012', 'Reusable bins introduced'], ['2016', 'Warehouse 100% solar'], ['7 days', 'Store drop-off, year round']].map(([k, v]) => (
            <div key={v} className="card"><dd className="text-3xl font-extrabold text-ink-900">{k}</dd><dt className="mt-1 text-sm text-stone-600">{v}</dt></div>
          ))}
        </dl>
      </section>
      <CtaBand title="Moving out this spring?" />
    </>
  )
}
