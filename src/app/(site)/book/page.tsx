import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import BookingWizard from '@/components/book/BookingWizard'
import { defaultCampusSlug, getCampusData, listCampuses } from '@/lib/campus'
import { getSession } from '@/lib/supabase/server'
import { isSupabaseConfigured } from '@/lib/supabase/env'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Book storage', robots: { index: false } }

export default async function BookPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams
  const slug = sp.campus ?? defaultCampusSlug
  const [campuses, data, session] = await Promise.all([listCampuses(), getCampusData(slug), getSession()])
  if (!data) redirect('/schools')
  if (!data.campus.bookable) redirect(`/schools/${data.campus.slug}`)

  const items: Record<string, number> = {}
  for (const pair of (sp.items ?? '').split(',')) {
    const [id, n] = pair.split(':')
    if (id && data.catalog.some((c) => c.id === id)) items[id] = Math.min(99, Math.max(0, parseInt(n, 10) || 0))
  }
  const p = session?.profile

  return (
    <BookingWizard
      campuses={campuses}
      data={data}
      initial={{ campus: data.campus.slug, as: sp.as === 'parent' ? 'parent' : 'student', service: sp.service === 'ship_ahead' ? 'ship_ahead' : 'storage', items }}
      signedIn={session ? { email: session.email, first_name: p?.first_name ?? '', last_name: p?.last_name ?? '', phone: p?.phone ?? '' } : null}
      backendReady={isSupabaseConfigured && !!process.env.SUPABASE_SERVICE_ROLE_KEY}
    />
  )
}
