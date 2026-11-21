import type { Metadata } from 'next'
import { contact, legal } from '@/config/site'
import { PageHero } from '@/components/ui'

export const metadata: Metadata = { title: 'Privacy policy', robots: { index: false }, alternates: { canonical: '/privacy' } }

// DRAFT, pending attorney review.
export default function Privacy() {
  return (
    <>
      <PageHero eyebrow="Legal" title="Privacy policy" />
      <section className="wrap py-12">
        <p className="mb-8 rounded-xl border border-gold-500/40 bg-gold-100 px-4 py-3 text-sm font-semibold text-ink-900">Draft pending legal review.</p>
        <div className="prose-site">
          <p>{legal.entity} collects only what it needs to store, ship and return your things.</p>
          <h2>What we collect</h2>
          <ul>
            <li>Account details: name, email, phone, school, and optionally your student ID and class year.</li>
            <li>Order details: items, photos of items taken at intake, addresses, appointment times and anyone you name to drop off or receive items.</li>
            <li>Payment details are handled by Stripe. Card and bank numbers never touch our servers.</li>
            <li>Basic site analytics and logs.</li>
          </ul>
          <h2>How we use it</h2>
          <p>We use this information to provide the service, send messages about your order (by text only if you opt in), take payment, handle claims and improve the site. We don’t sell personal information. Marketing email goes only to people who opt in separately.</p>
          <h2>Who we share it with</h2>
          <p>We share information only with service providers that help us run the service: Stripe (payments), our email and SMS providers, hosting and database providers, and our moving partner for pickups and deliveries. We also share it when the law requires.</p>
          <h2>Parents and collaborators</h2>
          <p>If you invite someone to your account, they can see the parts you allow. You can remove them at any time.</p>
          <h2>Retention and your choices</h2>
          <p>We keep order records as long as needed for the service, accounting and legal obligations. To access, correct or delete your information, email {contact.email}.</p>
        </div>
      </section>
    </>
  )
}
