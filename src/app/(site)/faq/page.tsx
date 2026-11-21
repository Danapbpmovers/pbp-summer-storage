import type { Metadata } from 'next'
import { defaultCampusSlug, getCampusData } from '@/lib/campus'
import { faqGroups } from '@/data/faq'
import { Faq, PageHero, campusDates } from '@/components/ui'

export const revalidate = 300
export const metadata: Metadata = {
  title: 'FAQ',
  description: 'Answers about booking, boxes, drop-off, fall delivery, payment, coverage, shipping and Ship Ahead.',
  alternates: { canonical: '/faq' },
}

export default async function FaqPage() {
  const d = (await getCampusData(defaultCampusSlug))!
  const groups = faqGroups(campusDates(d))
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: groups.flatMap((g) => g.items).map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
  }
  return (
    <>
      <PageHero eyebrow="FAQ" title="Frequently asked questions" />
      <section className="wrap grid gap-10 py-14 lg:grid-cols-[220px_1fr]">
        <nav aria-label="FAQ sections" className="lg:sticky lg:top-24 lg:self-start">
          <ul className="flex flex-wrap gap-2 lg:flex-col lg:gap-1">
            {groups.map((g) => <li key={g.id}><a href={`#${g.id}`} className="chip lg:border-0 lg:bg-transparent lg:px-0 hover:text-ink-900">{g.title}</a></li>)}
          </ul>
        </nav>
        <div className="space-y-12">
          {groups.map((g) => (
            <section key={g.id} id={g.id} className="scroll-mt-24">
              <h2 className="h3 mb-4 text-xl">{g.title}</h2>
              <Faq items={g.items} />
            </section>
          ))}
        </div>
      </section>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    </>
  )
}
