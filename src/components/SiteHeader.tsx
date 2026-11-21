import Link from 'next/link'
import { contact } from '@/config/site'
import { getSession, isStaffRole } from '@/lib/supabase/server'
import { Wordmark } from './Brand'
import MobileNav from './MobileNav'

export const mainNav = [
  { href: '/schools', label: 'Schools' },
  { href: '/how-it-works', label: 'How it works' },
  { href: '/pricing', label: 'Pricing' },
  { href: '/ship-ahead', label: 'Ship Ahead' },
  { href: '/for-parents', label: 'For parents' },
  { href: '/faq', label: 'FAQ' },
  { href: '/contact', label: 'Contact' },
]

export default async function SiteHeader() {
  const session = await getSession()
  const staff = isStaffRole(session?.profile?.role)
  return (
    <>
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:shadow">
        Skip to content
      </a>
      <div className="bg-ink-950 text-[13px] text-white/75">
        <div className="wrap flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-1.5">
          <span>
            Storage hotline <a className="font-semibold text-white" href={contact.phoneHref}>{contact.phone}</a>
            <span className="hidden sm:inline"> · {contact.hours}</span>
          </span>
          <a className="font-semibold text-gold-400 hover:text-gold-500" href={`mailto:${contact.email}`}>{contact.email}</a>
        </div>
      </div>
      <header className="sticky top-0 z-40 border-b border-stone-200/80 bg-white/90 backdrop-blur-md">
        <div className="wrap flex h-[68px] items-center justify-between gap-4">
          <Wordmark />
          <nav aria-label="Main" className="hidden items-center gap-0.5 xl:flex">
            {mainNav.map((n) => (
              <Link key={n.href} href={n.href} className="whitespace-nowrap rounded-lg px-3 py-2 text-[15px] font-medium text-stone-600 hover:bg-sand-50 hover:text-ink-900">
                {n.label}
              </Link>
            ))}
          </nav>
          <div className="hidden items-center gap-2 xl:flex">
            {session ? (
              <>
                {staff && <Link href="/admin" className="btn-outline btn-sm">Staff</Link>}
                <Link href="/app" className="btn-dark btn-sm">My account</Link>
              </>
            ) : (
              <>
                <Link href="/login" className="btn-outline btn-sm">Log in</Link>
                <Link href="/book" className="btn-primary btn-sm">Get started</Link>
              </>
            )}
          </div>
          <MobileNav nav={mainNav} signedIn={!!session} staff={staff} />
        </div>
      </header>
    </>
  )
}
