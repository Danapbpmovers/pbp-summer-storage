import type { Metadata } from 'next'
import Link from 'next/link'
import { contact } from '@/config/site'

export const metadata: Metadata = { title: 'Thank you', robots: { index: false } }

export default async function Thanks({ searchParams }: { searchParams: Promise<{ order?: string; paid?: string; pending?: string; cancelled?: string }> }) {
  const sp = await searchParams
  return (
    <section className="wrap max-w-2xl py-16">
      {sp.cancelled ? (
        <>
          <h1 className="h2">Payment not finished</h1>
          <p className="mt-4 text-lg text-stone-600">Your booking {sp.order ? `(order #${sp.order}) ` : ''}is saved but not paid. Confirm your email, log in and pay from your account.</p>
        </>
      ) : (
        <>
          <p className="eyebrow mb-3">{sp.order ? `Order #${sp.order}` : 'Booked'}</p>
          <h1 className="h2">You’re booked. Thank you!</h1>
          <p className="mt-4 text-lg text-stone-600">
            {sp.paid ? 'Your payment went through. Bank transfers can take a few days to clear, and we’ll email you when it does.' : sp.pending ? 'We’ll email you a payment link shortly.' : 'Your spot is reserved.'}
          </p>
        </>
      )}
      <div className="card mt-8">
        <h2 className="h3">Next: confirm your email</h2>
        <p className="mt-2 text-stone-600">We sent a link to your email. Confirm it, then log in to print your labels, add items, invite a parent or student, and track everything.</p>
        <Link href="/login?next=/app" className="btn-dark mt-5">Log in</Link>
      </div>
      <p className="mt-8 text-sm text-stone-500">Questions? {contact.email} · {contact.phone}</p>
    </section>
  )
}
