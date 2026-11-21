import type { Metadata, Viewport } from 'next'
import './globals.css'
import { brand, contact, siteUrl, store, warehouse } from '@/config/site'

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: 'Boston Student Summer Storage & Shipping | PackStoreShip', template: '%s | PackStoreShip' },
  description:
    'Summer storage, ship-home and Ship Ahead for Boston college students since 1986. Per-item pricing, no deposit, on-campus drop-off stations and curbside pickup.',
  openGraph: { siteName: brand.name, type: 'website', locale: 'en_US' },
  alternates: { canonical: '/' },
}

export const viewport: Viewport = { themeColor: '#2e1a12', width: 'device-width', initialScale: 1 }

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'LocalBusiness',
  name: brand.name,
  description: 'Student summer storage, shipping and Ship Ahead for Boston-area colleges.',
  url: siteUrl,
  email: contact.email,
  telephone: '+1-617-208-8226',
  foundingDate: String(brand.since),
  address: { '@type': 'PostalAddress', streetAddress: store.street, addressLocality: store.city, addressRegion: store.state, postalCode: store.zip, addressCountry: 'US' },
  areaServed: 'Boston, MA',
  openingHours: 'Mo-Fr 10:00-17:00',
  department: [{ '@type': 'LocalBusiness', name: 'Storage warehouse', address: { '@type': 'PostalAddress', streetAddress: warehouse.street, addressLocality: warehouse.city, addressRegion: warehouse.state, postalCode: warehouse.zip, addressCountry: 'US' } }],
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Fraunces:ital,wght@0,600;1,600&display=swap" />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      </head>
      <body>{children}</body>
    </html>
  )
}
