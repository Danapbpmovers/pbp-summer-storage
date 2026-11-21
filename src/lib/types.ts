export type ItemCategory = 'boxes' | 'bags' | 'bins' | 'appliances' | 'furniture' | 'oversized' | 'sports'

export const categoryLabels: Record<ItemCategory, string> = {
  boxes: 'Boxes',
  bags: 'Bags & luggage',
  bins: 'Bins & totes',
  appliances: 'Appliances & electronics',
  furniture: 'Furniture & décor',
  oversized: 'Oversized',
  sports: 'Sports & music',
}

export interface Campus {
  id: string
  slug: string
  name: string
  short_name: string
  timezone: string
  active: boolean
  bookable: boolean
  service_radius_miles: number
  in_room_pickup: boolean
  official_partner_copy: string | null
  official_partner_confirmed: boolean
  seo_title: string | null
  seo_description: string | null
  sort: number
}

export interface CatalogItem {
  id: string
  category: ItemCategory
  name: string
  price_cents: number
  note: string | null
  service_types: string[]
  active: boolean
  sort: number
}

export interface FeeRule {
  code: string
  name: string
  amount_cents: number
  unit: 'flat' | 'per_item' | 'per_lb'
  note?: string | null
}

export interface InsurancePlan {
  included_cents: number
  addon_cents_per_100: number
  max_per_box_cents: number | null
  max_per_order_cents: number | null
  claim_window_days: number
}

export interface CalendarWindow {
  key: string
  label: string
  starts_on: string
  ends_on: string | null
}

export type LocationType = 'store' | 'move_out_station' | 'move_in_station' | 'warehouse' | 'curbside_zone'

export interface Location {
  id: string
  type: LocationType
  name: string
  address: string | null
}

export interface Slot {
  id: string
  location_id: string | null
  kind: 'station_dropoff' | 'curbside_pickup' | 'delivery'
  date: string
  window_label: string
  capacity: number
  booked: number
}

export interface CampusData {
  campus: Campus
  catalog: CatalogItem[]
  fees: FeeRule[]
  insurance: InsurancePlan
  calendar: CalendarWindow[]
  locations: Location[]
  station_hours: { date: string; hours: string }[]
  slots?: Slot[]
}

export type OrderStatus =
  | 'reserved' | 'pending_payment' | 'confirmed' | 'scheduled' | 'received'
  | 'in_storage' | 'delivery_requested' | 'out_for_delivery' | 'completed' | 'cancelled'

export const orderStatusSteps: { status: OrderStatus; label: string }[] = [
  { status: 'reserved', label: 'Reserved' },
  { status: 'confirmed', label: 'Booked & paid' },
  { status: 'scheduled', label: 'Drop-off scheduled' },
  { status: 'received', label: 'Picked up / at station' },
  { status: 'in_storage', label: 'In our warehouse' },
  { status: 'delivery_requested', label: 'Delivery requested' },
  { status: 'out_for_delivery', label: 'Out for delivery / at move-in station' },
  { status: 'completed', label: 'Completed' },
]

export const orderStatusLabel = (s: string) =>
  s === 'pending_payment' ? 'Awaiting payment' : s === 'cancelled' ? 'Cancelled' : orderStatusSteps.find((x) => x.status === s)?.label ?? s
