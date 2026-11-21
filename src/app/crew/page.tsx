import type { Metadata, Viewport } from 'next'
import { redirect } from 'next/navigation'
import { getSession, isStaffRole } from '@/lib/supabase/server'
import { isSupabaseConfigured } from '@/lib/supabase/env'
import CrewApp from './CrewApp'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Crew intake', robots: { index: false } }
export const viewport: Viewport = { themeColor: '#ffffff', width: 'device-width', initialScale: 1, maximumScale: 1 }

export default async function CrewPage() {
  if (!isSupabaseConfigured) return <p className="p-6 text-lg">Connect Supabase to use crew mode.</p>
  const session = await getSession()
  if (!session) redirect('/login?next=/crew')
  if (!isStaffRole(session.profile?.role)) redirect('/app')
  return <CrewApp staffName={session.profile?.first_name || session.email} />
}
