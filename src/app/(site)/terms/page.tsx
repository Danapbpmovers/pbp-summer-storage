import type { Metadata } from 'next'
import { brand, contact, legal, payments } from '@/config/site'
import { PageHero } from '@/components/ui'

export const metadata: Metadata = { title: 'Terms & conditions', robots: { index: false }, alternates: { canonical: '/terms' } }

// DRAFT, pending attorney review. Not copied from any other company's terms.
export default function Terms() {
  return (
    <>
      <PageHero eyebrow="Legal" title="Terms & conditions" />
      <section className="wrap py-12">
        <p className="mb-8 rounded-xl border border-gold-500/40 bg-gold-100 px-4 py-3 text-sm font-semibold text-ink-900">Draft pending legal review. These terms are not yet in effect.</p>
        <div className="prose-site">
          <p>These terms govern storage, shipping and Ship Ahead services booked through {brand.name} and provided by {legal.entity} (“we”, “us”). By booking, you agree to them.</p>
          <h2>1. Services and storage term</h2>
          <p>Each stored item’s price covers up to four months of storage starting when we receive it. Storage beyond that is billed at our current extended-storage rate. Each storage period is a separate order, and an order ends when its items are delivered.</p>
          <h2>2. Prices, payment and saved payment methods</h2>
          <p>Prices and fees are listed on our pricing page. Prices shown are for bank transfer (ACH). Card payments are {payments.cardFeePercent}% higher, and both amounts are shown before you pay. You pay when you book. By saving a payment method you authorize us to charge it for amounts that come up under these terms, including items logged at drop-off that differ from your booking, overweight and unthawed-fridge fees, delivery and scheduling fees, shipping costs, extended storage and late fees. Each charge is itemized in your account. Unpaid balances may incur late fees, and we may hold delivery until the balance is paid.</p>
          <h2>3. Your responsibilities</h2>
          <p>You must pack items according to our packing guidelines, label them, and not store prohibited items: hazardous materials, open food, liquids in shipments, or anything illegal. We may refuse, return or dispose of prohibited items.</p>
          <h2>4. Pickup, drop-off and delivery</h2>
          <p>Curbside pickups must be requested at least 3 days in advance, and deliveries outside peak move-in need 72 hours’ notice. Fall delivery requests must be submitted by the deadline posted for your campus. Missed appointments and late scheduling incur the posted fees. Someone you name may drop off or receive items for you.</p>
          <h2>5. Declared value and liability</h2>
          <p>Each order includes $300 of declared-value coverage. You may buy more at the posted rate, up to $500 per box and $1,500 per order. Our liability for loss or damage is limited to the declared value, and to the actual cash value of the item if that is lower. We are not liable for items that were improperly packed, particle-board furniture that wasn’t disassembled, or electronics that weren’t boxed.</p>
          <h2>6. Claims</h2>
          <p>Report damage or loss through your account within 3 days of delivery. Keep the item, box and packing materials, and include photos and proof of value or repair cost.</p>
          <h2>7. Unclaimed property</h2>
          <p>If an account stays unpaid, or items remain unclaimed after we’ve made reasonable written attempts to contact you, we may dispose of the items as permitted by Massachusetts law. [Attorney to specify notice periods.]</p>
          <h2>8. Text messages</h2>
          <p>If you opt in, we’ll text you about your order. Message and data rates may apply. Reply STOP to opt out or HELP for help. Consent isn’t required to buy.</p>
          <h2>9. Changes and contact</h2>
          <p>We may update these terms, and the version in effect when you book applies to that order. Questions: {contact.email}, {contact.phone}.</p>
        </div>
      </section>
    </>
  )
}
