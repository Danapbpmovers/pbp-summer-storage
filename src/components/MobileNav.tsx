'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'

export default function MobileNav({ nav, signedIn, staff }: { nav: { href: string; label: string }[]; signedIn: boolean; staff: boolean }) {
  const [open, setOpen] = useState(false)
  const path = usePathname()
  useEffect(() => setOpen(false), [path])
  return (
    <div className="xl:hidden">
      <button className="btn-outline btn-sm px-3" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-controls="mobile-nav" aria-label="Menu">
        <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
          {open ? <path d="M5.3 4 10 8.7 14.7 4 16 5.3 11.3 10l4.7 4.7-1.3 1.3L10 11.3 5.3 16 4 14.7 8.7 10 4 5.3z" /> : <path d="M3 5h14v2H3zm0 4h14v2H3zm0 4h14v2H3z" />}
        </svg>
      </button>
      {open && (
        <nav id="mobile-nav" aria-label="Mobile" className="absolute inset-x-0 top-full border-b border-stone-200 bg-white px-4 pb-5 shadow-lg">
          {nav.map((n) => (
            <Link key={n.href} href={n.href} className="block border-b border-stone-100 py-3.5 text-[16px] font-medium text-stone-800">{n.label}</Link>
          ))}
          <div className="mt-4 grid grid-cols-2 gap-2">
            {signedIn ? (
              <>
                {staff ? <Link href="/admin" className="btn-outline">Staff</Link> : <Link href="/app/settings" className="btn-outline">Settings</Link>}
                <Link href="/app" className="btn-dark">My account</Link>
              </>
            ) : (
              <>
                <Link href="/login" className="btn-outline">Log in</Link>
                <Link href="/book" className="btn-primary">Get started</Link>
              </>
            )}
          </div>
        </nav>
      )}
    </div>
  )
}
