import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { brand, operator, store, warehouse } from '@/config/site'
import { getCampusData, listCampuses } from '@/lib/campus'
import { money, range, shortDay, day } from '@/lib/format'
import { CtaBand, PageHero, campusDates } from '@/components/ui'
import ReminderForm from '@/components/ReminderForm'

export const revalidate = 300

export async function generateStaticParams() {
  return (await listCampuses()).map((c) => ({ slug: c.slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const d = await getCampusData(slug)
  if (!d) return {}
  return {
    title: { absolute: d.campus.seo_title ?? `${d.campus.name} Student Storage | PackStoreShip` },
    description: d.campus.seo_description ?? undefined,
    alternates: { canonical: `/schools/${slug}` },
  }
}

export default async function CampusPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const d = await getCampusData(slug)
  if (!d) notFound()
  const c = d.campus
  const dates = campusDates(d)
  const stations = d.locations.filter((l) => l.type === 'move_out_station' || l.type === 'store')
  const fee = (code: string) => d.fees.find((f) => f.code === code)

  if (!c.bookable) {
    return (
      <>
        <PageHero eyebrow="Schools" title={`${c.name} student storage`} intro={`We’re setting up booking for ${c.name}. Leave your email and we’ll let you know when it opens. Until then, you can still drop off at ${operator}, ${store.street}, 7 days a week.`} />
        <section className="bg-ink-950 py-14 text-white">
          <div className="wrap"><ReminderForm campusSlug={c.slug} /></div>
        </section>
      </>
    )
  }

  return (
    <>
      <PageHero eyebrow={`${c.short_name} · Pack · Store · Ship`} title={`${c.name} summer storage & shipping`}
        intro={`Drop off at a Move-Out Station outside your residence hall, or book a curbside pickup. We’ll store everything and bring it back at move-in.`}>
        <div className="flex flex-wrap gap-3">
          <Link href={`/book?campus=${c.slug}`} className="btn-primary">Start booking for {c.short_name}</Link>
          <Link href={`/pricing?campus=${c.slug}`} className="btn-outline">{c.short_name} prices</Link>
        </div>
        {c.official_partner_confirmed && c.official_partner_copy && <p className="mt-6 max-w-2xl text-sm font-semibold text-ink-800">{c.official_partner_copy}</p>}
      </PageHero>

      <section className="wrap py-14">
        <h2 className="h2">Key dates</h2>
        <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {d.calendar.map((w) => (
            <li key={w.key} className="rounded-xl border border-stone-200 bg-white p-4">
              <p className="text-sm text-stone-600">{w.label}</p>
              <p className="mt-1 font-bold text-ink-900">{w.ends_on ? range(w.starts_on, w.ends_on) : day(w.starts_on)}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="bg-sand-50 py-14">
        <div className="wrap grid gap-10 lg:grid-cols-2">
          <div>
            <h2 className="h2">Move-out: how it works at {c.short_name}</h2>
            <div className="prose-site mt-4">
              <p>From {dates.stations}, our crew and PBP Movers staff Move-Out Stations outside the residence halls. Look for the trailers and trucks with Pack · Store · Ship signs.</p>
              <ol>
                <li><strong>Book online</strong> so your items, coverage and payment are set before you come down. You can also pay at the station.</li>
                <li><strong>Label everything.</strong> Print your QR labels from your account, or write your name, phone and {c.short_name} ID on each item.</li>
                <li><strong>Bring it to any station.</strong> You don’t need to request a pickup to use a station. Crew can’t do in-room pickups. Yellow carts are available at Res-Life offices.</li>
                <li><strong>We log and photograph each item.</strong> The photos show up in your account.</li>
              </ol>
              <p>Moving out after the stations close, or living off campus? Request a <strong>curbside pickup</strong> in your account at least 3 days ahead. It’s free during peak move-out, and {fee('pickup_nonpeak') ? `${money(fee('pickup_nonpeak')!.amount_cents)} on other dates` : 'a fee applies on other dates'}. Off-campus pickups must be within about {c.service_radius_miles} mile of campus.</p>
              <p>Need it back before {dates.earlyBefore}? Mark <strong>early withdrawal</strong> when you book.</p>
            </div>
          </div>
          <div>
            <h3 className="h3">Move-Out Stations</h3>
            <ul className="mt-3 divide-y divide-stone-200 rounded-2xl border border-stone-200 bg-white">
              {stations.map((s) => (
                <li key={s.id} className="px-4 py-3"><p className="font-semibold text-ink-900">{s.name}</p><p className="text-sm text-stone-600">{s.address}</p></li>
              ))}
            </ul>
            {d.station_hours.length > 0 && (
              <>
                <h3 className="h3 mt-8">Station hours</h3>
                <table className="tbl mt-2 rounded-2xl bg-white">
                  <tbody>{d.station_hours.map((h) => <tr key={h.date}><td className="font-medium">{shortDay(h.date)}</td><td className="text-right">{h.hours}</td></tr>)}</tbody>
                </table>
              </>
            )}
          </div>
        </div>
      </section>

      <section className="wrap grid gap-10 py-14 lg:grid-cols-2">
        <div>
          <h2 className="h2">Fall move-in</h2>
          <div className="prose-site mt-4">
            <p>Request your delivery in your account <strong>by {dates.deliveryDeadline}</strong> for deliveries {dates.fallWindow}. You’ll get a confirmation with your pickup date, time and Move-In Station.</p>
            <h3>Living on campus</h3>
            <p>Pick up your things at a Move-In Station near your new residence hall, anytime during or after your scheduled window while the station is open. On-campus delivery is <strong>free during peak move-in ({dates.peakMoveIn}), 9am–5pm</strong>. Other dates follow the standard delivery fees.</p>
            <h3>Living off campus</h3>
            <p>Request a date and time <strong>by {dates.offcampusDeadline}</strong>. Off-campus delivery is {fee('offcampus_delivery') ? money(fee('offcampus_delivery')!.amount_cents) : 'a flat fee'} from 9am to 5pm. No housing assignment yet? Book now and add your address later.</p>
          </div>
        </div>
        <div>
          <h2 className="h2">Ship Ahead to {c.short_name}</h2>
          <div className="prose-site mt-4">
            <p>Ship your boxes to our warehouse before you arrive. We store them for up to a month and deliver when you get to campus. Items must arrive <strong>by {dates.shipAheadArrival}</strong> and should ship at least two weeks before your arrival.</p>
            <p className="rounded-xl border border-stone-200 bg-sand-50 p-4 font-mono text-sm not-italic text-ink-900">
              {brand.ups ? 'The UPS Store Student Storage Program' : brand.name}<br />C/O {c.short_name} – (Student Name)<br />{warehouse.street}<br />{warehouse.city}, {warehouse.state} {warehouse.zip}
            </p>
            <p><Link href="/ship-ahead">Ship Ahead steps and pricing</Link></p>
          </div>
        </div>
      </section>

      <section className="wrap pb-6">
        <div className="card">
          <h2 className="h3">Need boxes, or storing during the summer?</h2>
          <p className="mt-2 text-stone-600">Add boxes, tape and mattress bags to your order, or buy them at {operator}, {store.street}, or at the Move-Out Stations. We can also deliver supplies. For urgent storage, drop off there 7 days a week, year round.</p>
        </div>
      </section>

      <CtaBand title={`Ready to book ${c.short_name} storage?`} body="It takes about five minutes, and there’s no deposit." href={`/book?campus=${c.slug}`} cta={`Start booking for ${c.short_name}`} />
    </>
  )
}
