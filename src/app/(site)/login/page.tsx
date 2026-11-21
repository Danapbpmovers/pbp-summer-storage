import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { LoginForm } from '@/components/AuthForm'
import { getSession } from '@/lib/supabase/server'

export const metadata: Metadata = { title: 'Log in', robots: { index: false } }

export default async function Login({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next = '/app' } = await searchParams
  if (await getSession()) redirect(next.startsWith('/') ? next : '/app')
  return (
    <section className="wrap flex justify-center py-16">
      <div className="card w-full max-w-md">
        <h1 className="h2 text-3xl">Log in</h1>
        <p className="mt-2 mb-6 text-stone-600">Students and parents use the same login.</p>
        <LoginForm next={next} />
        <p className="mt-6 border-t border-stone-100 pt-5 text-center text-sm text-stone-600">New here? <Link href="/book" className="font-semibold text-pbp-700 underline">Get started</Link>. Your account is created when you book.</p>
      </div>
    </section>
  )
}
