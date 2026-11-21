import type { Metadata } from 'next'
import { brand, contact, operator, store } from '@/config/site'
import { CtaBand, PageHero } from '@/components/ui'

export const metadata: Metadata = {
  title: 'Ship home – domestic & international',
  description: 'Ship your things home from Boston, domestically or internationally. We handle the customs forms.',
  alternates: { canonical: '/shipping' },
}

export default function Shipping() {
  return (
    <>
      <PageHero eyebrow="Ship home" title="Ship it home, anywhere in the world" intro={`Domestic and international shipping${brand.ups ? ' with UPS' : ''}. We’ll pack it if you need, and handle the customs paperwork.`} />
      <section className="wrap grid gap-10 py-14 lg:grid-cols-2">
        <div className="prose-site">
          <h2>How to ship</h2>
          <ul>
            <li>Bring boxes to a Move-Out Station during move-out week, or to {operator}, {store.street}, any time.</li>
            <li>Need a curbside pickup? Request it in your account. A pickup fee applies on non-peak dates.</li>
            <li>Already storing with us and not coming back? We can ship your stored items to you.</li>
          </ul>
          <h2>Cost</h2>
          <p>Shipping is billed at the actual carrier cost for the size, weight and destination. We’ll give you a quote before anything ships.</p>
        </div>
        <div className="prose-site">
          <h2>International</h2>
          <p>We ship internationally all the time and will prepare the customs forms with you. Have a list of what’s in each box and its value ready.</p>
          <h2>What can’t ship</h2>
          <p>Hazardous materials and liquids. If you’re not sure about an item, email <a href={`mailto:${contact.email}`}>{contact.email}</a>.</p>
        </div>
      </section>
      <CtaBand title="Questions about a shipment?" body={`Email ${contact.email} or call ${contact.phone}.`} href="/contact" cta="Contact us" />
    </>
  )
}
