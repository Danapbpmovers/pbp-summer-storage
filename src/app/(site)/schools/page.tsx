import type { Metadata } from 'next'
import Link from 'next/link'
import { listCampuses } from '@/lib/campus'
import { PageHero } from '@/components/ui'

export const revalidate = 300
export const metadata: Metadata = {
  title: 'Schools we serve',
  description: 'Student storage and shipping for Boston-area colleges, including Boston University and Emerson College.',
  alternates: { canonical: '/schools' },
}

export default async function SchoolsPage() {
  const campuses = await listCampuses()
  return (
    <>
      <PageHero eyebrow="Schools" title="Serving Boston-area colleges since 1986" intro="Choose your school to see how move-out and move-in work there, the key dates, and where to drop off." />
      <section className="wrap py-14">
        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {campuses.map((c) => (
            <li key={c.slug}>
              <Link href={`/schools/${c.slug}`} className="card flex h-full flex-col transition hover:border-ink-700 hover:shadow-md">
                <span className={`badge self-start ${c.bookable ? 'bg-gold-100 text-ink-800' : 'bg-stone-100 text-stone-600'}`}>{c.bookable ? 'Booking open' : 'Coming soon'}</span>
                <span className="mt-4 text-xl font-extrabold text-ink-900">{c.name}</span>
                <span className="mt-1 text-stone-600">{c.bookable ? 'Move-out stations, curbside pickup, Ship Ahead' : 'Details coming soon'}</span>
                <span className="mt-6 font-semibold text-pbp-700">View {c.short_name} details →</span>
              </Link>
            </li>
          ))}
        </ul>
        <p className="mt-10 text-stone-600">Don’t see your school? <Link href="/contact" className="font-semibold text-pbp-700 underline">Get in touch</Link>. We may still be able to help.</p>
      </section>
    </>
  )
}
