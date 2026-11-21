// Seed data for Boston University / general PackStoreShip, from the live
// packstoreship.com pages on Nov 21, 2026. This is the source for
// supabase/migrations/0002_seed.sql (npm run gen:seed) and the fallback the
// public site renders when Supabase isn't configured.
//
// Anything marked NEEDS_OWNER is inferred or conflicting on the old site and
// is shown as "needs owner confirmation" in /admin.

import type { CampusData } from '@/lib/types'

// Amounts are the actual published prices, which is what bank transfer (ACH) pays.
// Card prices are derived (+3%) at display and checkout time; see payments in config/site.ts.

const items: [string, string, number, string?][] = [
  // [category, name, cents, note]
  ['boxes', 'Large Box – 18×18×18 (3.4 cu ft)', 5500],
  ['boxes', 'Extra Large Box – 24×18×18 (4.5 cu ft)', 6500],
  ['bags', 'Blue Plastic Storage Bag', 6999],
  ['bags', 'Duffle – Standard (up to 32")', 6500],
  ['bags', 'Small Bag / Backpack / Carry-On', 5500],
  ['bags', 'Suitcase – Standard (up to 32")', 7999],
  ['bins', 'Plastic Bin / Tote – Standard', 5999],
  ['bins', 'Plastic Bin – 3 Drawer', 5999],
  ['bins', 'Plastic Bin – Under-Bed Flat', 6499],
  ['appliances', 'Dorm Fridge – Cube', 5999, 'Must be empty, defrosted and dry'],
  ['appliances', 'Dorm Fridge – Tall', 7999, 'Must be empty, defrosted and dry'],
  ['appliances', 'Microwave', 5999],
  ['appliances', 'Fan – Tower or Box', 4499],
  ['appliances', 'Vacuum', 4999],
  ['appliances', 'Printer (in box)', 5999],
  ['appliances', 'TV – Boxed, up to 44"', 8000, 'All TVs and monitors must be boxed'],
  ['furniture', 'Chair – Folding Round', 4999],
  ['furniture', 'Chair – Gaming / Executive', 7999],
  ['furniture', 'Table / Nightstand – Small', 5999],
  ['furniture', 'Lamp – Floor / Standing', 4999],
  ['furniture', 'Mirror', 3999],
  ['furniture', 'Dry Erase / Cork Board', 4999],
  ['furniture', "Rug – Small (3' × 5' or less)", 4999],
  ['furniture', 'Ironing Board', 4499],
  ['oversized', 'Bed Frame – Metal', 6999],
  ['oversized', 'Bookcase (over 36" tall)', 9999],
  ['oversized', 'Futon – Metal Frame and Mattress', 15000],
  ['oversized', 'Mattress – Twin', 12500, 'Must be in an approved mattress bag'],
  ['oversized', 'Mattress – Full / Queen', 15000, 'Must be in an approved mattress bag'],
  ['oversized', 'Sofa – 2 Cushion', 17500],
  ['sports', 'Bike', 7999],
  ['sports', 'Ski / Snowboard', 7500],
  ['sports', 'Skate or Longboard', 4999],
  ['sports', 'Guitar – Acoustic (in case)', 6999],
  ['sports', 'Guitar – Electric (in case only)', 6999],
  ['sports', 'Keyboard (under 36")', 6499],
  ['sports', 'Keyboard (over 36")', 7999],
  ['sports', 'Poster Tube / Triangle Box', 3999],
]

export const buSeed: CampusData = {
  campus: {
    id: 'seed-bu',
    slug: 'boston-university',
    name: 'Boston University',
    short_name: 'BU',
    timezone: 'America/New_York',
    active: true,
    bookable: true,
    service_radius_miles: 1,
    in_room_pickup: false,
    // NEEDS_OWNER: keep only if BU still names you its only approved vendor.
    official_partner_copy:
      'The UPS Store Storage Service is the only Boston University–approved storage and shipping service for BU students.',
    official_partner_confirmed: false,
    seo_title: 'Boston University Summer Storage & Shipping | PackStoreShip',
    seo_description:
      'BU summer storage, ship-home and Ship Ahead for Boston University students. Drop off at on-campus Move-Out Stations or book curbside pickup. Since 1986.',
    sort: 0,
  },
  catalog: items.map(([category, name, price_cents, note], i) => ({
    id: `seed-item-${i}`,
    category: category as CampusData['catalog'][number]['category'],
    name,
    price_cents,
    note: note ?? null,
    service_types: ['storage'],
    active: true,
    sort: i,
  })),
  fees: [
    { code: 'pickup_nonpeak', name: 'Pickup – non-peak dates', amount_cents: 10000, unit: 'flat', note: 'Curbside pickup is free on peak move-out dates.' },
    { code: 'delivery_weekday', name: 'Delivery – weekday, non-peak', amount_cents: 10000, unit: 'flat' },
    { code: 'delivery_saturday', name: 'Delivery – Saturday, non-peak', amount_cents: 12500, unit: 'flat' },
    { code: 'delivery_sunday', name: 'Delivery – Sunday, non-peak', amount_cents: 15000, unit: 'flat' },
    { code: 'delivery_evening', name: 'Evening delivery 5–7pm (additional)', amount_cents: 5999, unit: 'flat' },
    { code: 'offcampus_delivery', name: 'Off-campus delivery, peak move-in, 9am–5pm', amount_cents: 9999, unit: 'flat' },
    { code: 'ship_ahead', name: 'Ship Ahead – per item', amount_cents: 3999, unit: 'per_item', note: 'Receiving, up to 1 month storage and weekday curbside delivery.' },
    { code: 'ship_ahead_oversize', name: 'Ship Ahead oversize – per item', amount_cents: 1500, unit: 'per_item', note: 'Over 50 lb or larger than 20×20×20 in.' },
    { code: 'late_scheduling', name: 'Late scheduling', amount_cents: 3999, unit: 'flat' },
    { code: 'missed_appointment', name: 'Missed appointment / rescheduling', amount_cents: 4999, unit: 'flat' },
    { code: 'shrinkwrap', name: 'Shrinkwrap – per item', amount_cents: 799, unit: 'per_item' },
    { code: 'unthawed_fridge', name: 'Unthawed fridge', amount_cents: 5000, unit: 'per_item' },
    { code: 'overweight', name: 'Overweight box – per lb over 50 lb', amount_cents: 125, unit: 'per_lb', note: 'Maximum box weight is 75 lb.' },
    { code: 'late_payment', name: 'Late payment', amount_cents: 2500, unit: 'flat', note: 'Plus $5 per week overdue.' },
  ],
  insurance: {
    included_cents: 30000,
    addon_cents_per_100: 300,
    max_per_box_cents: 50000, // NEEDS_OWNER: packing guidelines only
    max_per_order_cents: 150000, // NEEDS_OWNER: packing guidelines only
    claim_window_days: 3,
  },
  // Placeholder 2027 dates, following the 2026 pattern. NEEDS_OWNER: confirm all.
  calendar: [
    { key: 'peak_move_out', label: 'Peak move-out (free curbside pickup)', starts_on: '2027-05-01', ends_on: '2027-05-09' },
    { key: 'move_out_stations', label: 'On-campus Move-Out Stations open', starts_on: '2027-05-01', ends_on: '2027-05-08' },
    { key: 'early_withdrawal_before', label: 'Mark "Early Withdrawal" if you need items back before', starts_on: '2027-07-01', ends_on: null },
    { key: 'delivery_request_deadline', label: 'Fall delivery requests due (on campus)', starts_on: '2027-08-02', ends_on: null },
    { key: 'offcampus_request_deadline', label: 'Fall delivery requests due (off campus)', starts_on: '2027-08-05', ends_on: null },
    { key: 'ship_ahead_arrival', label: 'Ship Ahead items must reach the warehouse by', starts_on: '2027-08-05', ends_on: null },
    { key: 'fall_delivery_window', label: 'Fall storage delivery window', starts_on: '2027-08-20', ends_on: '2027-09-10' },
    { key: 'peak_move_in', label: 'Peak move-in (free on-campus delivery 9am–5pm)', starts_on: '2027-08-23', ends_on: '2027-08-30' },
  ],
  locations: [
    { id: 'seed-loc-0', type: 'move_out_station', name: 'Warren Towers', address: 'In front of the dorm' },
    { id: 'seed-loc-1', type: 'move_out_station', name: 'West & StuVi II', address: '33 Harry Agganis Way, in front of StuVi II' },
    { id: 'seed-loc-2', type: 'move_out_station', name: 'The Towers on Bay State Road', address: 'In front of the dorm, 140 Bay State Rd' },
    { id: 'seed-loc-3', type: 'move_out_station', name: 'Kilachand Hall', address: 'Bay State Road, in front of the dorm' },
    { id: 'seed-loc-4', type: 'move_out_station', name: 'Myles Standish Hall', address: 'Next to the Beacon Street entrance' },
    { id: 'seed-loc-5', type: 'move_out_station', name: 'South Campus', address: 'Corner of Buswell St at Park Drive' },
    { id: 'seed-loc-6', type: 'move_out_station', name: 'Fenway Campus', address: 'Room 103, 37 Pilgrim Rd' },
    { id: 'seed-loc-7', type: 'store', name: 'The UPS Store – West Campus', address: '1089 Commonwealth Ave, Boston, MA 02215' },
    { id: 'seed-loc-8', type: 'warehouse', name: 'Warehouse', address: '100 Adams Road #4, Clinton, MA 01510' },
  ],
  // Station hours, placeholder 2027 (2026 pattern shifted one day earlier).
  station_hours: [
    { date: '2027-05-01', hours: '12pm – 4pm' },
    { date: '2027-05-02', hours: '12pm – 4pm' },
    { date: '2027-05-03', hours: '12pm – 4pm' },
    { date: '2027-05-04', hours: '12pm – 4pm' },
    { date: '2027-05-05', hours: '10am – 5pm' },
    { date: '2027-05-06', hours: '10am – 5pm' },
    { date: '2027-05-07', hours: '9am – 5pm' },
    { date: '2027-05-08', hours: '9am – 1pm (select stations)' },
  ],
}

export const otherCampuses = [
  {
    id: 'seed-emerson',
    slug: 'emerson-college',
    name: 'Emerson College',
    short_name: 'Emerson',
    timezone: 'America/New_York',
    active: true,
    bookable: false,
    service_radius_miles: 1,
    in_room_pickup: false,
    official_partner_copy: null,
    official_partner_confirmed: false,
    seo_title: 'Emerson College Summer Storage | PackStoreShip',
    seo_description: 'Summer storage and shipping for Emerson College students in Boston.',
    sort: 1,
  },
]

/** Items shown in the "needs owner confirmation" panel in /admin. */
export const ownerQuestions = [
  'Confirm 2027 peak move-out, station, deadline and move-in dates (all seeded as placeholders).',
  'Insurance caps: $500 per box and $1,500 per contract appear only in the packing guidelines.',
  'FAQ said furniture can’t be stored, but the price list includes furniture. The new FAQ follows the price list.',
  'Confirm Boston University still names this program its only approved storage vendor before showing that line.',
  'Supply delivery fee, professional TV packing fee and mattress bag price are not published. They are not shown.',
  'Extended or year-round storage rate is not published. It is an admin field with no default.',
  'Sales tax on storage. None is applied today.',
  'Emerson: stations, dates and process. The campus page is shown as "coming soon" and isn’t bookable.',
]
