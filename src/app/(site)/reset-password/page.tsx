import type { Metadata } from 'next'
import { ResetForm } from '@/components/AuthForm'

export const metadata: Metadata = { title: 'Choose a new password', robots: { index: false } }

export default function Reset() {
  return (
    <section className="wrap flex justify-center py-16">
      <div className="card w-full max-w-md"><h1 className="h2 mb-6 text-3xl">Choose a new password</h1><ResetForm /></div>
    </section>
  )
}
