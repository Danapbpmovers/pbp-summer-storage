import type { Metadata } from 'next'
import { PageHero, CtaBand } from '@/components/ui'

export const metadata: Metadata = { title: 'Reviews', alternates: { canonical: '/reviews' } }

// Owner-approved testimonials only. Add { quote, name, detail } entries here when you have them.
const reviews: { quote: string; name: string; detail: string }[] = []

export default function Reviews() {
  return (
    <>
      <PageHero eyebrow="Reviews" title="What students and parents say" />
      <section className="wrap py-14">
        {reviews.length === 0 ? (
          <p className="max-w-2xl text-stone-600">We ask every customer for a review after their fall delivery. Reviews will appear here as they come in.</p>
        ) : (
          <ul className="grid gap-5 md:grid-cols-3">
            {reviews.map((r) => (
              <li key={r.name} className="card"><blockquote className="text-stone-700">“{r.quote}”</blockquote><p className="mt-4 font-semibold text-ink-900">{r.name}</p><p className="text-sm text-stone-500">{r.detail}</p></li>
            ))}
          </ul>
        )}
      </section>
      <CtaBand title="Ready to book?" />
    </>
  )
}
