import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/supabase/server'
import { isSupabaseConfigured } from '@/lib/supabase/env'

export const dynamic = 'force-dynamic'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  if (!isSupabaseConfigured) {
    return <section className="wrap py-16"><h1 className="h2">Accounts aren’t connected yet</h1><p className="mt-3 text-stone-600">Connect Supabase (see README) to turn on accounts.</p></section>
  }
  const session = await getSession()
  if (!session) redirect('/login?next=/app')
  return (
    <div className="wrap py-8">
      <div className="no-print mb-8 flex flex-wrap items-center justify-between gap-3 border-b border-stone-200 pb-4">
        <p className="text-sm text-stone-600">Signed in as <strong className="text-ink-900">{session.email}</strong></p>
        <nav className="flex gap-2 text-sm" aria-label="Account">
          <Link href="/app" className="btn-outline btn-sm">My orders</Link>
          <Link href="/app/settings" className="btn-outline btn-sm">Settings</Link>
          <form action="/auth/signout" method="post"><button className="btn-outline btn-sm">Log out</button></form>
        </nav>
      </div>
      {children}
    </div>
  )
}
