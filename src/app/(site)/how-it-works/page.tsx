import type { Metadata } from 'next'
import Link from 'next/link'
import { operator, store } from '@/config/site'
import { defaultCampusSlug, getCampusData } from '@/lib/campus'
import { CtaBand, PageHero, campusDates } from '@/components/ui'

export const revalidate = 300
export const metadata: Metadata = {
  title: 'How it works',
  description: 'How student summer storage works: sign up, pack, drop off at a campus station or book curbside pickup, and get everything back at move-in.',
  alternates: { canonical: '/how-it-works' },
}

export default async function HowItWorks() {
  const d = (await getCampusData(defaultCampusSlug))!
  const dates = campusDates(d)
  const steps = [
    { t: 'Book online', b: 'Choose your school, add the items you’re storing and see your total as you go. Students or parents can book. Not sure what you’re storing yet? Reserve now and add items later.' },
    { t: 'Get boxes and pack', b: `Add boxes, tape and mattress bags when you book, or buy them at ${operator}, ${store.street}, or at the campus stations. Follow the packing guidelines: tape boxes top and bottom, bag mattresses, box TVs and keep boxes under 50 lb.` },
    { t: 'Label each item', b: 'Print your QR labels from your account and stick one on each item. No printer? Write your name, phone number and student ID on each one, and our crew will label it at drop-off.' },
    { t: 'Drop off or schedule a pickup', b: `From ${dates.stations}, bring things to a Move-Out Station outside your residence hall. Moving out on another date or living off campus? Book a curbside pickup at least 3 days ahead.` },
    { t: 'We log, photograph and store', b: 'The crew scans each label and takes a photo, which appears in your account. Your things go to our climate-controlled, solar-powered warehouse in Clinton, MA. If the items differ from your booking, the difference is itemized and charged to your saved payment method.' },
    { t: 'Request fall delivery', b: `Request delivery by ${dates.deliveryDeadline}. On-campus students pick up at a Move-In Station near their new hall, free during peak move-in (${dates.peakMoveIn}). Off-campus delivery and shipping are also available.` },
  ]
  return (
    <>
      <PageHero eyebrow="How it works" title="From move-out to move-in, handled" intro="Here’s exactly what happens to your things, start to finish." />
      <section className="wrap py-14">
        <ol className="relative space-y-6 border-l-2 border-stone-200 pl-8 sm:pl-10">
          {steps.map((s, i) => (
            <li key={s.t} className="relative">
              <span className="absolute -left-[49px] flex h-9 w-9 items-center justify-center rounded-full bg-ink-900 text-sm font-extrabold text-gold-400 sm:-left-[57px]">{i + 1}</span>
              <h2 className="h3 text-xl">{s.t}</h2>
              <p className="mt-2 max-w-2xl text-stone-600">{s.b}</p>
            </li>
          ))}
        </ol>
        <div className="mt-12 grid gap-5 md:grid-cols-3">
          <div className="card"><h3 className="h3">Your account</h3><p className="mt-2 text-stone-600">See every item with its photo, print labels, schedule delivery, pay invoices and share access with a parent.</p></div>
          <div className="card"><h3 className="h3">Text updates</h3><p className="mt-2 text-stone-600">If you opt in, we’ll text you when your items arrive, when the delivery deadline is coming up, and on delivery day.</p></div>
          <div className="card"><h3 className="h3">Real people</h3><p className="mt-2 text-stone-600">Questions? Email or call our Boston team, or stop by the store on Comm Ave.</p></div>
        </div>
        <p className="mt-8 text-stone-600">See the details for your school on the <Link href={`/schools/${d.campus.slug}`} className="font-semibold text-pbp-700 underline">{d.campus.name} page</Link>.</p>
      </section>
      <CtaBand title="Ready when you are" body="Booking takes about five minutes." />
    </>
  )
}
