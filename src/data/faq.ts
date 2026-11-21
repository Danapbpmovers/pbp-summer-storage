// FAQ, rewritten and grouped from the old packstoreship.com FAQ.
// Dates are pulled from the campus calendar at render time, so {placeholders} stay current.
import { brand, contact, operator } from '@/config/site'

export interface FaqItem { q: string; a: string }
export interface FaqGroup { id: string; title: string; items: FaqItem[] }

export function faqGroups(d: { deliveryDeadline: string; fallWindow: string; peakMoveOut: string; earlyBefore: string }): FaqGroup[] {
  return [
    {
      id: 'booking', title: 'Booking & payment', items: [
        { q: 'Do I need to pay a deposit?', a: 'No. Signing up is free and there’s no deposit. You pay per item when your things are stored.' },
        { q: 'When do I pay, and how?', a: 'You pay for the items you book when you check out online. Bank transfer (ACH) pays the listed price. Card payments are 3% higher. We save your payment method so later charges, such as extra items logged at drop-off, an overweight box or a delivery fee, can be added to your account. You’ll get an itemized receipt for each one.' },
        { q: 'What if I bring more or different items than I booked?', a: 'Our crew logs every item at drop-off. If the count or type differs from your booking, the difference is charged to your saved payment method and shows up in your account with a photo of each item.' },
        { q: 'Can a parent book and pay?', a: 'Yes. A parent can book for a student, or a student can invite a parent to their account to view items and photos, pay invoices or schedule deliveries.' },
      ],
    },
    {
      id: 'boxes', title: 'Boxes & supplies', items: [
        { q: 'Where do I get boxes and tape?', a: `Storage customers get free boxes and tape at ${operator}, 1089 Commonwealth Ave, Boston. Boxes are also sold at the on-campus Move-Out Stations during move-out week, and we can deliver supplies for a small fee.` },
      ],
    },
    {
      id: 'pickup', title: 'Drop-off & pickup', items: [
        { q: 'How does move-out work at BU?', a: `During move-out week, Move-Out Stations are set up outside the residence halls. Bring your things down, and our crew will label, log and photograph each item. You don’t need to request a pickup to use a station. Peak move-out is ${d.peakMoveOut}.` },
        { q: 'Will you pick up from my room?', a: 'Not at BU right now. Bring your items to a station or to the curb for a scheduled curbside pickup.' },
        { q: 'Do you pick up off campus?', a: 'Yes. During peak move-out we offer curbside pickup within about one mile of campus. Request it in your account at least 3 days ahead. Pickups on non-peak dates have a fee, listed on the pricing page.' },
        { q: 'Can I store at any time of year?', a: `Yes. Storage is available year round. You can drop off at ${operator}, 1089 Commonwealth Ave, 7 days a week.` },
      ],
    },
    {
      id: 'delivery', title: 'Getting your things back', items: [
        { q: 'How do I get my storage back in the fall?', a: `Request delivery in your account by ${d.deliveryDeadline} for deliveries ${d.fallWindow}. On-campus students pick up at a Move-In Station near their residence hall, and peak-date on-campus delivery is free. Off-campus delivery has a fee.` },
        { q: 'I don’t know my fall address yet. Can I still book?', a: 'Yes. Choose “I don’t have my housing assignment yet” and add it later in your account, before the delivery-request deadline.' },
        { q: 'Can I get my things back early?', a: `Yes. There’s no early-withdrawal fee, though delivery fees may apply. If you’ll need your things before ${d.earlyBefore}, mark “early withdrawal” when booking so we can store them for faster retrieval.` },
        { q: 'Outside move-in, how much notice do you need?', a: 'Deliveries outside the peak move-in window need 72 hours’ notice.' },
        { q: 'I’m not coming back. Can you ship my things?', a: 'Yes. We can ship your stored items anywhere, domestic or international. You pay the actual shipping cost.' },
      ],
    },
    {
      id: 'storage', title: 'Storage terms', items: [
        { q: 'How long does the price cover?', a: 'Each item’s price covers up to 4 months. There’s no discount for shorter storage.' },
        { q: 'I need two separate storage periods.', a: 'Two periods are two orders. Once your items are delivered, the first order ends.' },
        { q: 'Do you offer extended storage?', a: 'Yes, you can store for as long as you need. Extended storage is billed at the current extended-storage rate. Ask us for a quote.' },
        { q: 'What can’t I store?', a: 'Hazardous materials, open food and liquids. Furniture is welcome (see the pricing page for furniture items). Particle-board furniture should be taken apart first.' },
      ],
    },
    {
      id: 'coverage', title: 'Coverage & claims', items: [
        { q: 'What coverage is included?', a: 'Every order includes $300 of declared-value coverage. You can add more at $3 per additional $100 when you book.' },
        { q: 'Is there a coverage limit?', a: 'Coverage is capped at $500 per box and $1,500 per order.' },
        { q: 'Something was damaged. What do I do?', a: 'Tell us within 3 days of delivery through your account. Keep the box and packing materials, and include photos and proof of the item’s value or repair cost.' },
      ],
    },
    {
      id: 'shipping', title: 'Shipping & Ship Ahead', items: [
        { q: 'Can you ship internationally?', a: `Yes. ${brand.ups ? 'We ship with UPS and handle' : 'We handle'} the customs forms for you.` },
        { q: 'What can’t I ship?', a: 'Hazardous materials and liquids.' },
        { q: 'What is Ship Ahead?', a: 'Incoming students ship boxes to our warehouse before they arrive. We receive them, store them for up to a month and deliver when you get to campus. See the Ship Ahead page for the steps and deadline.' },
      ],
    },
    {
      id: 'packing', title: 'Packing', items: [
        { q: 'Do I need to bag my mattress?', a: 'Yes. All mattresses must be in an approved mattress bag. Bags are sold at the Move-Out Stations.' },
        { q: 'Do TVs and monitors need a box?', a: 'Yes. All TVs and monitors must be boxed, ideally in their original packaging.' },
        { q: 'How heavy can a box be?', a: 'Boxes over 50 lb have a $1.25 per pound fee, and the maximum is 75 lb. Use small boxes for books.' },
      ],
    },
    {
      id: 'contact', title: 'Still stuck?', items: [
        { q: 'How do I reach a person?', a: `Email ${contact.email} for the fastest reply, or call ${contact.phone} (${contact.hours}).` },
      ],
    },
  ]
}
