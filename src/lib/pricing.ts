// Pure pricing engine shared by the browser (live cart) and the server (the
// amount actually charged). The server always re-runs this against database
// prices; it never trusts totals sent by the browser.

import type { CampusData, FeeRule } from './types'
import { inWindow } from './format'

export interface CartInput {
  service: 'storage' | 'ship_ahead'
  items: Record<string, number> // catalog item id -> quantity
  ship_ahead_count: number
  ship_ahead_oversize: number
  declared_value_cents: number // total coverage wanted, including the free amount
  dropoff_method: 'station' | 'curbside' | 'undecided'
  dropoff_date: string | null
  return_method: 'on_campus' | 'off_campus' | 'ship' | 'extended' | 'undecided'
}

export interface Promo {
  code: string
  percent_off: number | null
  amount_off_cents: number | null
}

export interface Line {
  label: string
  qty: number
  unit_cents: number
  total_cents: number
  kind: 'item' | 'ship_ahead' | 'coverage' | 'fee' | 'discount'
  ref?: string
}

export interface Quote {
  lines: Line[]
  item_count: number
  subtotal_cents: number
  discount_cents: number
  due_now_cents: number
  later: { label: string; amount_cents: number }[]
  coverage: { declared_cents: number; included_cents: number; addon_cents: number; capped: boolean }
  warnings: string[]
}

export type PayMethod = 'ach' | 'card'

export interface PaymentBreakdown {
  method: PayMethod
  ach_cents: number   // actual price — what bank transfer pays
  card_cents: number  // actual price + card percentage
  total_cents: number // for the chosen method
}

/** Dual pricing: ACH pays the actual amount; card pays it plus cardFeePercent. */
export function applyPaymentMethod(actualCents: number, method: PayMethod, cfg: { cardFeePercent: number }): PaymentBreakdown {
  const card = Math.round(actualCents * (1 + cfg.cardFeePercent / 100))
  return { method, ach_cents: actualCents, card_cents: card, total_cents: method === 'card' ? card : actualCents }
}

const fee = (fees: FeeRule[], code: string) => fees.find((f) => f.code === code)

export function coverageAddon(declared: number, included: number, centsPer100: number) {
  if (declared <= included) return 0
  return Math.ceil((declared - included) / 10000) * centsPer100
}

export function quote(data: CampusData, cart: CartInput, promo?: Promo | null): Quote {
  const lines: Line[] = []
  const later: Quote['later'] = []
  const warnings: string[] = []
  let itemCount = 0

  if (cart.service === 'storage') {
    for (const item of data.catalog) {
      const qty = Math.max(0, Math.min(99, Math.floor(cart.items[item.id] ?? 0)))
      if (!qty || !item.active) continue
      itemCount += qty
      lines.push({ label: item.name, qty, unit_cents: item.price_cents, total_cents: qty * item.price_cents, kind: 'item', ref: item.id })
    }
  } else {
    const sa = fee(data.fees, 'ship_ahead')
    const count = Math.max(0, Math.min(99, Math.floor(cart.ship_ahead_count)))
    if (sa && count) {
      itemCount += count
      lines.push({ label: 'Ship Ahead item', qty: count, unit_cents: sa.amount_cents, total_cents: count * sa.amount_cents, kind: 'ship_ahead', ref: sa.code })
    }
    const os = fee(data.fees, 'ship_ahead_oversize')
    const big = Math.min(count, Math.max(0, Math.floor(cart.ship_ahead_oversize)))
    if (os && big) lines.push({ label: 'Oversize surcharge', qty: big, unit_cents: os.amount_cents, total_cents: big * os.amount_cents, kind: 'fee', ref: os.code })
  }

  // Coverage
  const ins = data.insurance
  let declared = Math.max(ins.included_cents, cart.declared_value_cents || 0)
  let capped = false
  if (ins.max_per_order_cents && declared > ins.max_per_order_cents) {
    declared = ins.max_per_order_cents
    capped = true
  }
  const addon = coverageAddon(declared, ins.included_cents, ins.addon_cents_per_100)
  if (addon) lines.push({ label: `Extra coverage to $${(declared / 100).toLocaleString()}`, qty: 1, unit_cents: addon, total_cents: addon, kind: 'coverage' })

  // Pickup fee: curbside is free only on peak move-out dates.
  if (cart.service === 'storage' && cart.dropoff_method === 'curbside' && cart.dropoff_date) {
    const peak = data.calendar.find((c) => c.key === 'peak_move_out')
    const isPeak = peak ? inWindow(cart.dropoff_date, peak.starts_on, peak.ends_on) : false
    const f = fee(data.fees, 'pickup_nonpeak')
    if (!isPeak && f) lines.push({ label: f.name, qty: 1, unit_cents: f.amount_cents, total_cents: f.amount_cents, kind: 'fee', ref: f.code })
  }

  // Return fees are billed when the delivery is scheduled.
  if (cart.return_method === 'off_campus') {
    const f = fee(data.fees, 'offcampus_delivery')
    if (f) later.push({ label: `${f.name} — billed when you schedule delivery`, amount_cents: f.amount_cents })
  }
  if (cart.return_method === 'ship') later.push({ label: 'Shipping to your address — actual carrier cost, quoted later', amount_cents: 0 })

  const subtotal = lines.reduce((s, l) => s + l.total_cents, 0)
  let discount = 0
  if (promo) {
    const base = lines.filter((l) => l.kind === 'item' || l.kind === 'ship_ahead').reduce((s, l) => s + l.total_cents, 0)
    if (promo.percent_off) discount = Math.round((base * promo.percent_off) / 100)
    else if (promo.amount_off_cents) discount = Math.min(base, promo.amount_off_cents)
    if (discount) lines.push({ label: `Promo ${promo.code}`, qty: 1, unit_cents: -discount, total_cents: -discount, kind: 'discount' })
  }

  if (capped) warnings.push(`Coverage is capped at $${(ins.max_per_order_cents! / 100).toLocaleString()} per order.`)

  return {
    lines,
    item_count: itemCount,
    subtotal_cents: subtotal,
    discount_cents: discount,
    due_now_cents: Math.max(0, subtotal - discount),
    later,
    coverage: { declared_cents: declared, included_cents: ins.included_cents, addon_cents: addon, capped },
    warnings,
  }
}
