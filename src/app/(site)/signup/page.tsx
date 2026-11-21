import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { SignupForm } from '@/components/AuthForm'
import { getSession } from '@/lib/supabase/server'

export const metadata: Metadata = { title: 'Create an account', robots: { index: false } }

// Account without a booking: for parents, staff, or students who want to set up first.
// Booking also creates an account, so most students never need this page.
export default async function Signup() {
  if (await getSession()) redirect('/app')
  return (
    <section className="wrap flex justify-center py-16">
      <div className="card w-full max-w-md">
        <h1 className="h2 text-3xl">Create an account</h1>
        <p className="mt-2 mb-6 text-stone-600">Storing this summer? <Link href="/book" className="font-semibold text-pbp-700 underline">Book storage</Link> instead. Your account is created as part of booking.</p>
        <SignupForm />
        <p className="mt-6 border-t border-stone-100 pt-5 text-center text-sm text-stone-600">Already have an account? <Link href="/login" className="font-semibold text-pbp-700 underline">Log in</Link></p>
      </div>
    </section>
  )
}
