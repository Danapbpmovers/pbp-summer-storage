import type { Metadata } from 'next'
import { PageHero } from '@/components/ui'

export const metadata: Metadata = {
  title: 'Packing guidelines',
  description: 'How to pack for student storage: labeling, taping, weight limits, mattresses, TVs, fridges and furniture.',
  alternates: { canonical: '/packing-guidelines' },
}

const rules: [string, string][] = [
  ['Label everything', 'Put a QR label from your account on each item, or write your name and phone number on the outside with a marker. For suitcases and duffles, also put a note with your name and number inside.'],
  ['Tape top and bottom', 'Tape every box closed on both ends. Don’t fold the flaps under each other, and ask our crew if you’re not sure how.'],
  ['Fill the space', 'Fill gaps with paper or bubble wrap so nothing shifts. Fragile items need at least 3 inches of padding on every side.'],
  ['Mind the weight', 'If you can’t lift it, neither can we. Boxes over 50 lb have a $1.25 per pound fee, and the maximum is 75 lb. Pack books in small boxes.'],
  ['Bins must close', 'Reusable bins have to close completely without bulging.'],
  ['Box TVs and monitors', 'All TVs and monitors must be boxed, ideally in the original packaging. Ask us about professional packing if you need it.'],
  ['Bag mattresses', 'Every mattress must be in an approved mattress bag. Bags are sold at the Move-Out Stations.'],
  ['Defrost fridges', 'Fridges must be empty, defrosted and dry. An unthawed fridge has a fee.'],
  ['Take apart particle-board furniture', 'Flat-pack furniture isn’t built to be moved. Take it apart first, or we can’t be responsible for damage. Shrink-wrap at the station helps protect it.'],
  ['Keep an inventory', 'Note what’s in each box. It helps when you choose your coverage and if you ever need to file a claim.'],
]

export default function Packing() {
  return (
    <>
      <PageHero eyebrow="Packing" title="Packing guidelines" intro="Pack it right and it comes back the way it left. Please read these before move-out." />
      <section className="wrap py-14">
        <ol className="grid gap-4 md:grid-cols-2">
          {rules.map(([t, b], i) => (
            <li key={t} className="card flex gap-4">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gold-100 text-sm font-extrabold text-ink-900">{i + 1}</span>
              <div><h2 className="h3">{t}</h2><p className="mt-1 text-stone-600">{b}</p></div>
            </li>
          ))}
        </ol>
        <div className="mt-10 rounded-2xl border border-stone-200 bg-sand-50 p-6 text-stone-700">
          <h2 className="h3">Coverage and damage</h2>
          <p className="mt-2">Coverage is up to $500 per box and $1,500 per order. If you find damage, keep the box and all packing materials, and report it in your account within 3 days of delivery with proof of the item’s value or repair cost.</p>
        </div>
      </section>
    </>
  )
}
