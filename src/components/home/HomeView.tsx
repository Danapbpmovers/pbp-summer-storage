import Link from 'next/link'
import { brand, cardPrice, operator, store } from '@/config/site'
import { defaultCampusSlug, getCampusData, listCampuses } from '@/lib/campus'
import { money } from '@/lib/format'
import { faqGroups } from '@/data/faq'
import CampusPicker from '@/components/CampusPicker'
import ReminderForm from '@/components/ReminderForm'
import { Check, Faq, campusDates } from '@/components/ui'

const steps = [
  { n: 1, t: 'Sign up in minutes', b: 'Pick your school, add your items and see your total as you go.' },
  { n: 2, t: 'Pack', b: `Add boxes, tape and mattress bags to your order, or buy them at ${operator} on Comm Ave or at the campus stations.` },
  { n: 3, t: 'Drop off or schedule curbside', b: 'Bring things to a Move-Out Station outside your dorm, or book a curbside pickup. Each item is labeled and photographed.' },
  { n: 4, t: 'We bring it back', b: 'Request fall delivery in your account. Pick up at a Move-In Station near your new hall, or have it delivered off campus.' },
]

export default async function HomeView() {
  const [campuses, bu] = await Promise.all([listCampuses(), getCampusData(defaultCampusSlug)])
  const dates = bu ? campusDates(bu) : null
  const largeBox = bu?.catalog.find((i) => i.name.startsWith('Large Box'))
  const faq = dates ? faqGroups(dates).flatMap((g) => g.items).filter((f) =>
    ['When do I pay, and how?', 'How does move-out work at BU?', 'How do I get my storage back in the fall?', 'What coverage is included?', 'Can a parent book and pay?', 'What can’t I store?'].includes(f.q)) : []

  return (
    <>
      <section className="relative overflow-hidden bg-gradient-to-b from-sand-50 to-white">
        <div aria-hidden className="pointer-events-none absolute -right-40 -top-40 h-[520px] w-[520px] rounded-full bg-gold-100/70 blur-3xl" />
        <div className="wrap relative grid items-center gap-12 py-16 sm:py-24 lg:grid-cols-[1.15fr_1fr]">
          <div>
            <p className="eyebrow mb-4">Boston student storage · since {brand.since}</p>
            <h1 className="text-[40px] font-extrabold leading-[1.05] tracking-tight text-ink-900 sm:text-6xl">
              Don’t haul your dorm home for the summer.
            </h1>
            <p className="mt-5 max-w-xl text-lg text-stone-600 sm:text-xl">
              We store it, ship it or have it waiting when you arrive. Summer storage, ship-home and Ship Ahead for Boston college students.
            </p>
            <div className="mt-8 max-w-xl">
              <CampusPicker campuses={campuses} />
              <p className="mt-3 text-sm text-stone-500">
                Not ready to book? <Link href="/pricing" className="font-semibold text-pbp-700 underline underline-offset-2">Estimate my cost</Link>
              </p>
            </div>
            <ul className="mt-8 flex flex-wrap gap-2" aria-label="Highlights">
              <li className="chip">Serving BU since {brand.since}</li>
              <li className="chip">ACH discount when you pay by bank</li>
              <li className="chip">Solar-powered warehouse</li>
                          </ul>
          </div>
          <div className="relative">
            <div className="card relative rotate-1 p-0 shadow-xl shadow-ink-900/10">
              <div className="flex items-center justify-between border-b border-stone-100 px-6 py-4">
                <p className="font-bold text-ink-900">Your storage</p>
                <span className="badge bg-gold-100 text-ink-800">Booked</span>
              </div>
              <ul className="divide-y divide-stone-100 px-6 text-[15px]">
                {[['Large Box – 18×18×18', 3], ['Dorm Fridge – Cube', 1], ['Suitcase – Standard', 1], ['Mattress – Twin', 1]].map(([n, q]) => {
                  const item = bu?.catalog.find((i) => i.name.startsWith(String(n).split(' –')[0]))
                  return (
                    <li key={String(n)} className="flex justify-between py-3">
                      <span>{n} <span className="text-stone-400">× {q}</span></span>
                      <span className="font-semibold">{item ? money(cardPrice(item.price_cents) * Number(q)) : ''}</span>
                    </li>
                  )
                })}
              </ul>
              <div className="flex items-center justify-between rounded-b-[var(--radius-card)] bg-sand-50 px-6 py-4">
                <span className="text-sm text-stone-600">Up to 4 months · $300 coverage included</span>
              </div>
            </div>
            <div className="card absolute -bottom-20 -left-6 hidden w-60 -rotate-2 p-4 shadow-lg sm:block">
              <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">Text update</p>
              <p className="mt-1 text-sm text-stone-700">We’ve received your 6 items. Photos are in your account.</p>
            </div>
          </div>
        </div>
      </section>
      {/* How it works */}
      <section className="wrap py-20" aria-labelledby="how">
        <p className="eyebrow mb-3">How it works</p>
        <h2 id="how" className="h2 max-w-2xl">Four steps, and the heavy lifting is ours.</h2>
        <ol className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((s) => (
            <li key={s.n} className="card">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-ink-900 text-lg font-extrabold text-gold-400">{s.n}</span>
              <h3 className="h3 mt-5">{s.t}</h3>
              <p className="mt-2 text-stone-600">{s.b}</p>
            </li>
          ))}
        </ol>
        <p className="mt-6 text-stone-600">Each item gets a QR label and an intake photo, and you’ll see all of it in an account you can share with a parent. <Link href="/how-it-works" className="font-semibold text-pbp-700 underline underline-offset-2">More on how it works</Link></p>
      </section>

      {/* Services */}
      <section className="bg-sand-50 py-20" aria-labelledby="services">
        <div className="wrap">
          <h2 id="services" className="h2">Store it, ship it or send it ahead</h2>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {[
              { t: 'Summer storage', b: 'Per-item pricing for up to 4 months in our climate-controlled warehouse. Extended and year-round storage available.', href: '/pricing', l: 'See prices' },
              { t: 'Ship home', b: `Domestic and international shipping${brand.ups ? ' with UPS' : ''}. We’ll handle the customs paperwork.`, href: '/shipping', l: 'Shipping' },
              { t: 'Ship Ahead', b: 'Incoming? Ship your boxes to our warehouse and we’ll deliver them when you arrive in Boston.', href: '/ship-ahead', l: 'How Ship Ahead works' },
            ].map((s) => (
              <div key={s.t} className="card flex flex-col">
                <h3 className="h3 text-xl">{s.t}</h3>
                <p className="mt-2 flex-1 text-stone-600">{s.b}</p>
                <Link href={s.href} className="mt-5 font-semibold text-pbp-700">{s.l} →</Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing teaser */}
      <section className="wrap grid gap-10 py-20 lg:grid-cols-2 lg:items-center" aria-labelledby="pricing">
        <div>
          <p className="eyebrow mb-3">Pricing</p>
          <h2 id="pricing" className="h2">Pay per item. Nothing hidden.</h2>
          <p className="mt-4 text-lg text-stone-600">
            {largeBox ? <>A large box is <strong className="text-ink-900">{money(cardPrice(largeBox.price_cents))}</strong> for the whole summer, or {money(largeBox.price_cents)} with the ACH discount. </> : null}
            Every price covers up to 4 months and includes $300 of coverage. Every fee is listed publicly.
          </p>
          <ul className="mt-6 space-y-3 text-stone-700">
            {['No early-withdrawal fee', 'Save with the ACH discount when you pay by bank', 'Free curbside pickup on peak move-out dates', 'Add extra coverage when you book'].map((t) => (
              <li key={t} className="flex gap-2"><Check />{t}</li>
            ))}
          </ul>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/pricing" className="btn-dark">Estimate my cost</Link>
            <Link href="/pricing#fees" className="btn-outline">See every fee</Link>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          {(bu?.catalog ?? []).filter((i) => ['Large Box', 'Extra Large Box', 'Dorm Fridge – Cube', 'Mattress – Twin', 'Bike', 'Suitcase'].some((n) => i.name.startsWith(n))).slice(0, 6).map((i) => (
            <div key={i.id} className="rounded-2xl border border-stone-200 bg-white p-4">
              <p className="text-sm text-stone-600">{i.name.replace(/ \(.*\)$/, '')}</p>
              <p className="mt-1 text-2xl font-extrabold text-ink-900">{money(cardPrice(i.price_cents))}</p>
              <p className="text-sm font-semibold text-ok">{money(i.price_cents)} with ACH</p>
            </div>
          ))}
        </div>
      </section>

      {/* Local proof */}
      <section className="bg-ink-900 py-20 text-white" aria-labelledby="why">
        <div className="wrap">
          <h2 id="why" className="text-3xl font-extrabold tracking-tight sm:text-4xl">Local since {brand.since}</h2>
          <div className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { t: 'Our own warehouse', b: 'Climate controlled in Clinton, MA, and 100% solar powered since 2016.' },
              { t: 'On campus at move-out', b: 'Stations outside the BU residence halls, staffed by our crew and PBP Movers.' },
              { t: 'A store down the street', b: `${store.name.replace(' – Boston University', '')}, ${store.street}. Drop off 7 days a week, year round.` },
              { t: 'Reusable bins since 2012', b: 'Durable bins that cut down on cardboard, one of Boston’s greener storage options.' },
            ].map((x) => (
              <div key={x.t}>
                <h3 className="text-lg font-bold text-gold-400">{x.t}</h3>
                <p className="mt-2 text-white/70">{x.b}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Parents */}
      <section className="wrap py-20">
        <div className="grid gap-8 rounded-[1.75rem] border border-pbp-600/20 bg-pbp-50 p-8 sm:p-12 lg:grid-cols-[1.4fr_1fr] lg:items-center">
          <div>
            <p className="eyebrow mb-3 text-pbp-700">For parents</p>
            <h2 className="h2">Book it for them, or just keep an eye on it.</h2>
            <p className="mt-4 text-lg text-stone-600">Parents can book and pay, or be invited to a student’s account to see item photos, invoices and delivery dates.</p>
          </div>
          <div className="flex flex-wrap gap-3 lg:justify-end">
            <Link href="/for-parents" className="btn-dark">How it works for parents</Link>
            <Link href="/book?as=parent" className="btn-outline">Book as a parent</Link>
          </div>
        </div>
      </section>

      {/* Reviews: no fabricated quotes. Real testimonials go in src/data/reviews.ts when provided. */}
      <section className="wrap pb-6" aria-labelledby="reviews">
        <h2 id="reviews" className="h2">What students and parents say</h2>
        <p className="mt-3 max-w-2xl text-stone-600">
          Reviews will appear here once real customers submit them after their fall delivery. <Link href="/reviews" className="font-semibold text-pbp-700 underline underline-offset-2">Reviews page</Link>
        </p>
      </section>

      {/* FAQ */}
      <section className="wrap py-16" aria-labelledby="faq">
        <div className="grid gap-10 lg:grid-cols-[1fr_1.6fr]">
          <div>
            <h2 id="faq" className="h2">Questions</h2>
            <p className="mt-3 text-stone-600">The quick answers. <Link href="/faq" className="font-semibold text-pbp-700 underline underline-offset-2">See the full FAQ</Link></p>
          </div>
          <Faq items={faq} />
        </div>
      </section>

      {/* Reminder capture */}
      <section className="bg-ink-950 py-16 text-white">
        <div className="wrap flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl">Not moving out yet?</h2>
            <p className="mt-2 text-white/70">We’ll email you before {dates?.peakMoveOut ?? 'move-out'} and again before the fall delivery deadline.</p>
          </div>
          <ReminderForm />
        </div>
      </section>
    </>
  )
}
