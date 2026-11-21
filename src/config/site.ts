// Site-wide brand, contact and legal settings.
// Prices, fees, dates, stations and capacity are data (Supabase, editable in /admin);
// src/data/seed.ts is only the fallback/seed copy.

/**
 * The UPS Store affiliation. The owner confirmed (Nov 2026) the program keeps
 * The UPS Store branding, with PBP Movers as partner. Set to false to remove
 * every UPS Store mention from the site.
 */
export const show_ups_affiliation = true

export const brand = {
  name: 'PackStoreShip',
  programName: 'Pack · Store · Ship',
  ups: show_ups_affiliation ? { name: 'The UPS Store', store: '0983', full: 'The UPS Store 0983' } : null,
  partner: 'PBP Movers',
  partnerLong: 'Piece by Piece Movers',
  partnerLine:
    'Pickups, move-out stations and fall deliveries are run with our moving partner, PBP Movers (Piece by Piece Movers).',
  since: 1986,
}

/** Name used in running copy: "The UPS Store" when affiliated, otherwise "PackStoreShip". */
export const operator = brand.ups?.name ?? brand.name

export const legal = {
  entity: 'Piece by Piece Movers LLC',
  franchiseNotice: show_ups_affiliation
    ? 'The UPS Store® locations are independently owned and operated franchises. Storage and Ship Ahead services are offered only through our Boston locations.'
    : '',
}

export const contact = {
  email: 'support@packstoreship.com',
  phone: '617-208-8226',
  phoneHref: 'tel:+16172088226',
  hours: 'Mon – Fri, 10am – 5pm ET',
  timezone: 'America/New_York',
}

export const store = {
  name: show_ups_affiliation ? 'The UPS Store – Boston University' : 'PackStoreShip Store',
  street: '1089 Commonwealth Ave',
  city: 'Boston',
  state: 'MA',
  zip: '02215',
}

export const warehouse = {
  street: '100 Adams Road #4',
  city: 'Clinton',
  state: 'MA',
  zip: '01510',
}

/**
 * Dual pricing through Stripe, presented as an ACH discount (owner decision, Nov 2026, Massachusetts).
 * Stored prices are the ACH amounts (e.g. $55.00). The listed price everywhere is the card price
 * (stored + 3%, e.g. $56.65), and paying by bank transfer shows an "ACH discount" back to the stored
 * amount. Savings are shown in dollars, not as a percent, because $1.65 off $56.65 is 2.9%, not 3%.
 */
export const payments = {
  cardFeePercent: 3,
  defaultMethod: 'ach' as 'ach' | 'card',
}

/** Listed (card) price for a stored ACH amount. */
export const cardPrice = (cents: number) => Math.round(cents * (1 + payments.cardFeePercent / 100))

/** "$56.65 ($55.00 with ACH discount)" for running text. */
export const priceText = (achCents: number) => {
  const m = (c: number) => (c / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' })
  return `${m(cardPrice(achCents))} (${m(achCents)} with ACH discount)`
}

export const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.packstoreship.com'

export const referralSources = [
  'Google / internet search',
  'Email',
  'Instagram / TikTok',
  'Facebook',
  'Flyer',
  'From a friend',
  'School website',
  'Previous customer',
  'In store',
  'PBP Movers',
  'Other',
]
