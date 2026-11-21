import type { Metadata } from 'next'
import { ForgotForm } from '@/components/AuthForm'

export const metadata: Metadata = { title: 'Reset password', robots: { index: false } }

export default function Forgot() {
  return (
    <section className="wrap flex justify-center py-16">
      <div className="card w-full max-w-md"><h1 className="h2 mb-6 text-3xl">Reset your password</h1><ForgotForm /></div>
    </section>
  )
}
