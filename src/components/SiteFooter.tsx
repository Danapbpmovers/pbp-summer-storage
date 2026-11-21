import Link from 'next/link'
import { brand, contact, legal, store, warehouse } from '@/config/site'
import { listCampuses } from '@/lib/campus'
import { Wordmark } from './Brand'

export default async function SiteFooter() {
  const campuses = await listCampuses()
  const cols = [
    { title: 'Services', links: [['/how-it-works', 'How it works'], ['/pricing', 'Pricing'], ['/ship-ahead', 'Ship Ahead'], ['/shipping', 'Ship home'], ['/packing-guidelines', 'Packing guidelines']] },
    { title: 'Schools', links: [...campuses.map((c) => [`/schools/${c.slug}`, c.name]), ['/schools', 'All schools']] },
    { title: 'Company', links: [['/about', 'About us'], ['/for-parents', 'For parents'], ['/reviews', 'Reviews'], ['/faq', 'FAQ'], ['/employment', 'Employment'], ['/contact', 'Contact']] },
  ]
  return (
    <footer className="bg-ink-900 text-[15px] text-white/70">
      <div className="wrap grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <Wordmark inverted />
          <p className="mt-5 max-w-sm">Summer storage, ship-home and Ship Ahead for Boston college students since {brand.since}.</p>
          <p className="mt-3 max-w-sm text-white/55">{brand.partnerLine}</p>
          <div className="mt-6 space-y-1">
            <p><a href={contact.phoneHref} className="font-semibold text-white">{contact.phone}</a> · {contact.hours}</p>
            <p><a href={`mailto:${contact.email}`} className="text-gold-400 hover:text-gold-500">{contact.email}</a></p>
          </div>
        </div>
        {cols.map((c) => (
          <div key={c.title}>
            <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-white">{c.title}</h2>
            <ul className="space-y-2.5">
              {c.links.map(([href, label]) => (
                <li key={href}><Link href={href} className="hover:text-white">{label}</Link></li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="wrap grid gap-4 border-t border-white/10 py-6 text-[13px] text-white/50 sm:grid-cols-2">
        <p>
          {store.name}, {store.street}, {store.city}, {store.state} {store.zip}
          <br />Warehouse: {warehouse.street}, {warehouse.city}, {warehouse.state} {warehouse.zip}
        </p>
        <p className="sm:text-right">
          <Link href="/terms" className="hover:text-white">Terms</Link> · <Link href="/privacy" className="hover:text-white">Privacy</Link>
        </p>
      </div>
      <div className="bg-ink-950 py-4 text-[12px] text-white/45">
        <div className="wrap">
          © {brand.since}–{new Date().getFullYear()} {legal.entity}. All rights reserved. {legal.franchiseNotice}
        </div>
      </div>
    </footer>
  )
}
