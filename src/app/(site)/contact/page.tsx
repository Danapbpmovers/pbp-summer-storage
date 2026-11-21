import type { Metadata } from 'next'
import { contact, store, warehouse } from '@/config/site'
import { PageHero } from '@/components/ui'

export const metadata: Metadata = {
  title: 'Contact us',
  description: 'Email support@packstoreship.com or call 617-208-8226 (Mon–Fri 10–5 ET).',
  alternates: { canonical: '/contact' },
}

export default function Contact() {
  return (
    <>
      <PageHero eyebrow="Contact" title="We’re here to help" intro="For the fastest answer, email us. Most questions get a reply the same business day." />
      <section className="wrap grid gap-5 py-14 md:grid-cols-3">
        <div className="card">
          <h2 className="h3">Email</h2>
          <p className="mt-2"><a className="text-lg font-semibold text-pbp-700 underline" href={`mailto:${contact.email}`}>{contact.email}</a></p>
          <p className="hint">Storage, pickups, deliveries, shipping and billing.</p>
        </div>
        <div className="card">
          <h2 className="h3">Storage hotline</h2>
          <p className="mt-2"><a className="text-lg font-semibold text-ink-900" href={contact.phoneHref}>{contact.phone}</a></p>
          <p className="hint">{contact.hours}</p>
        </div>
        <div className="card">
          <h2 className="h3">Visit</h2>
          <p className="mt-2 text-stone-700">{store.name}<br />{store.street}<br />{store.city}, {store.state} {store.zip}</p>
          <p className="hint">Warehouse (no walk-ins): {warehouse.street}, {warehouse.city}, {warehouse.state}</p>
        </div>
      </section>
    </>
  )
}
