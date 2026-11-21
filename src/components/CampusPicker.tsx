'use client'
import { useRouter } from 'next/navigation'
import { useId, useMemo, useState } from 'react'

interface C { slug: string; name: string; short_name: string; bookable: boolean }

/** Typeahead campus picker (combobox pattern, keyboard accessible). */
export default function CampusPicker({ campuses, size = 'lg' }: { campuses: C[]; size?: 'lg' | 'md' }) {
  const router = useRouter()
  const id = useId()
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const matches = useMemo(() => {
    const s = q.trim().toLowerCase()
    return campuses.filter((c) => !s || c.name.toLowerCase().includes(s) || c.short_name.toLowerCase().includes(s))
  }, [q, campuses])

  const go = (c?: C) => {
    if (!c) return
    router.push(c.bookable ? `/book?campus=${c.slug}` : `/schools/${c.slug}`)
  }

  return (
    <div className="relative w-full">
      <label htmlFor={id} className="sr-only">Find your school</label>
      <div className={`flex items-center gap-2 rounded-2xl border border-stone-300 bg-white p-1.5 shadow-lg shadow-ink-900/5 ${size === 'lg' ? 'sm:p-2' : ''}`}>
        <svg className="ml-3 h-5 w-5 shrink-0 text-stone-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden><path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 1 0 3.4 9.8l3.6 3.7 1.1-1.1-3.7-3.6A5.5 5.5 0 0 0 9 3.5ZM5 9a4 4 0 1 1 8 0 4 4 0 0 1-8 0Z" clipRule="evenodd" /></svg>
        <input
          id={id}
          role="combobox"
          aria-expanded={open}
          aria-controls={`${id}-list`}
          aria-activedescendant={open && matches[active] ? `${id}-${matches[active].slug}` : undefined}
          autoComplete="off"
          placeholder="Find your school — e.g. Boston University"
          className="min-h-11 w-full min-w-0 bg-transparent text-[16px] outline-none placeholder:text-stone-400"
          value={q}
          onChange={(e) => { setQ(e.target.value); setOpen(true); setActive(0) }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 120)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') { e.preventDefault(); setOpen(true); setActive((a) => Math.min(a + 1, matches.length - 1)) }
            if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)) }
            if (e.key === 'Enter') { e.preventDefault(); go(matches[active]) }
            if (e.key === 'Escape') setOpen(false)
          }}
        />
        <button type="button" className="btn-primary shrink-0" onClick={() => go(matches[active] ?? campuses[0])}>
          Get started
        </button>
      </div>
      {open && (
        <ul id={`${id}-list`} role="listbox" className="absolute inset-x-0 top-full z-20 mt-2 overflow-hidden rounded-xl border border-stone-200 bg-white py-1 text-left shadow-xl">
          {matches.length === 0 && <li className="px-4 py-3 text-sm text-stone-500">We don’t serve that school yet. <a className="font-semibold text-pbp-700 underline" href="/contact">Ask us</a>.</li>}
          {matches.map((c, i) => (
            <li
              key={c.slug}
              id={`${id}-${c.slug}`}
              role="option"
              aria-selected={i === active}
              onMouseDown={(e) => { e.preventDefault(); go(c) }}
              onMouseEnter={() => setActive(i)}
              className={`flex cursor-pointer items-center justify-between px-4 py-3 text-[15px] ${i === active ? 'bg-sand-50' : ''}`}
            >
              <span className="font-semibold text-ink-900">{c.name}</span>
              <span className={`badge ${c.bookable ? 'bg-gold-100 text-ink-800' : 'bg-stone-100 text-stone-600'}`}>{c.bookable ? 'Booking open' : 'Coming soon'}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
