import 'server-only'
import Stripe from 'stripe'

/** null until STRIPE_SECRET_KEY is set (use your existing Stripe account's key). */
export const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null

/** Stripe payment method types for our two payment options. */
export const stripeMethodTypes = (method: 'ach' | 'card'): Stripe.Checkout.SessionCreateParams.PaymentMethodType[] =>
  method === 'ach' ? ['us_bank_account'] : ['card']
