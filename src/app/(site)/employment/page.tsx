import type { Metadata } from 'next'
import { contact } from '@/config/site'
import { PageHero } from '@/components/ui'

export const metadata: Metadata = { title: 'Employment', description: 'Seasonal move-out and move-in jobs in Boston.', alternates: { canonical: '/employment' } }

export default function Employment() {
  return (
    <>
      <PageHero eyebrow="Employment" title="Work move-out and move-in with us" intro="We hire seasonal crew for the busy weeks in May and late August: station staff, drivers and warehouse help." />
      <section className="wrap py-14">
        <div className="prose-site">
          <p>To apply, email <a href={`mailto:${contact.email}?subject=Seasonal%20job%20application`}>{contact.email}</a> with your name, phone number, the dates you’re available and the kind of work you’re interested in.</p>
        </div>
      </section>
    </>
  )
}
