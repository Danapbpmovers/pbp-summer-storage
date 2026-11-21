import 'server-only'
import Stripe from 'stripe'

/** null until STRIPE_SECRET_KEY is set. Prefer a restricted key (rk_) with only the permissions below. */
export const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null

/**
 * Which payment methods a Checkout Session offers. Dual pricing means each session must be
 * locked to one price tier: the ACH-discount session may offer only bank transfer, and the
 * card session offers cards and wallets (Apple Pay, Google Pay, Link card).
 *
 * Stripe's recommended way is a Payment Method Configuration per tier, created in the Dashboard
 * (Settings → Payments → Payment methods → "Create configuration") and set as:
 *   STRIPE_PMC_ACH  = pmc_…  (only ACH Direct Debit on)
 *   STRIPE_PMC_CARD = pmc_…  (cards + wallets on, ACH off)
 * Until those exist we fall back to an explicit list so the tiers stay locked.
 */
export function checkoutMethods(method: 'ach' | 'card'): Pick<Stripe.Checkout.SessionCreateParams, 'payment_method_configuration' | 'payment_method_types'> {
  const pmc = method === 'ach' ? process.env.STRIPE_PMC_ACH : process.env.STRIPE_PMC_CARD
  if (pmc) return { payment_method_configuration: pmc }
  return { payment_method_types: method === 'ach' ? ['us_bank_account'] : ['card'] }
}
