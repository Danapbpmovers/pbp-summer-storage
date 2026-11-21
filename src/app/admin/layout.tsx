import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Wordmark } from '@/components/Brand'
import { getSession, isStaffRole } from '@/lib/supabase/server'
import { isSupabaseConfigured } from '@/lib/supabase/env'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Staff', robots: { index: false } }

const nav = [['/admin', 'Overview'], ['/admin/orders', 'Orders'], ['/admin/catalog', 'Prices'], ['/admin/calendar', 'Dates & capacity']]

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  if (!isSupabaseConfigured) return <div className="wrap py-16"><h1 className="h2">Connect Supabase to use staff tools.</h1></div>
  const session = await getSession()
  if (!session) redirect('/login?next=/admin')
  if (!isStaffRole(session.profile?.role)) redirect('/app')
  return (
    <div className="min-h-screen bg-sand-50">
      <header className="border-b border-stone-200 bg-white">
        <div className="wrap flex flex-wrap items-center justify-between gap-3 py-3">
          <Wordmark />
          <nav className="flex flex-wrap gap-1 text-sm" aria-label="Staff">
            {nav.map(([href, label]) => <Link key={href} href={href} className="rounded-lg px-3 py-2 font-semibold text-stone-700 hover:bg-sand-100">{label}</Link>)}
            <a href="/api/admin/export" className="rounded-lg px-3 py-2 font-semibold text-pbp-700 hover:bg-sand-100">Export CSV</a>
          </nav>
          <span className="text-xs text-stone-500">{session.email} · {session.profile?.role}</span>
        </div>
      </header>
      <main id="main" className="wrap py-8">{children}</main>
    </div>
  )
}
