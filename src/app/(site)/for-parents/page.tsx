import type { Metadata } from 'next'
import Link from 'next/link'
import { brand } from '@/config/site'
import { Check, CtaBand, PageHero } from '@/components/ui'

export const metadata: Metadata = {
  title: 'For parents',
  description: 'Book and pay for your student’s summer storage, or join their account to see item photos, invoices and delivery dates.',
  alternates: { canonical: '/for-parents' },
}

export default function ForParents() {
  return (
    <>
      <PageHero eyebrow="For parents" title="Summer storage you don’t have to worry about" intro={`A local Boston team since ${brand.since}. You can book it yourself, or join your student’s account and keep an eye on it.`}>
        <div className="flex flex-wrap gap-3">
          <Link href="/book?as=parent" className="btn-primary">Book as a parent</Link>
          <Link href="/faq" className="btn-outline">Read the FAQ</Link>
        </div>
      </PageHero>
      <section className="wrap grid gap-6 py-14 md:grid-cols-3">
        {[
          { t: 'Book and pay', b: 'Book for your student on your phone in a few minutes, and pay by bank transfer or card.' },
          { t: 'Join their account', b: 'Your student can invite you. You’ll see every item with its photo, every invoice, and the delivery date and location.' },
          { t: 'Clear costs', b: 'Per-item prices and a public fee list. Anything added at drop-off, such as an overweight box, is itemized with a reason.' },
        ].map((x) => <div key={x.t} className="card"><h2 className="h3">{x.t}</h2><p className="mt-2 text-stone-600">{x.b}</p></div>)}
      </section>
      <section className="wrap pb-6">
        <div className="card">
          <h2 className="h3">What’s included</h2>
          <ul className="mt-4 grid gap-3 text-stone-700 sm:grid-cols-2">
            {['Up to 4 months of storage per item', '$300 of declared-value coverage per order', 'Climate-controlled, solar-powered warehouse', 'A photo of each item when it’s received', 'Free on-campus delivery during peak move-in', 'Email and phone support from our Boston team'].map((t) => <li key={t} className="flex gap-2"><Check />{t}</li>)}
          </ul>
        </div>
      </section>
      <CtaBand title="Book for your student" href="/book?as=parent" cta="Book as a parent" />
    </>
  )
}
