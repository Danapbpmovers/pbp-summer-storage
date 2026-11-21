import 'server-only'
import { createClient } from '@supabase/supabase-js'
import { SUPABASE_ANON_KEY, SUPABASE_URL, isSupabaseConfigured } from './supabase/env'
import { buSeed, otherCampuses } from '@/data/seed'
import type { Campus, CampusData } from './types'

// Public data is read with the anon key (no cookies) so marketing pages can be
// statically generated and revalidated. Falls back to the seed copy.
const anon = isSupabaseConfigured ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false } }) : null

export async function listCampuses(): Promise<Campus[]> {
  if (anon) {
    const { data } = await anon.from('campuses').select('*').eq('active', true).order('sort')
    if (data?.length) return data as Campus[]
  }
  return [buSeed.campus, ...otherCampuses]
}

export async function getCampusData(slug: string): Promise<CampusData | null> {
  if (anon) {
    const { data: campus } = await anon.from('campuses').select('*').eq('slug', slug).maybeSingle()
    if (campus) {
      const id = campus.id
      const [catalog, fees, insurance, calendar, locations, hours, slots] = await Promise.all([
        anon.from('catalog_items').select('*').eq('campus_id', id).eq('active', true).order('sort'),
        anon.from('fee_rules').select('*').eq('campus_id', id).eq('active', true).order('sort'),
        anon.from('insurance_plans').select('*').eq('campus_id', id).maybeSingle(),
        anon.from('calendar_windows').select('*').eq('campus_id', id).order('starts_on'),
        anon.from('locations').select('*').eq('campus_id', id).eq('active', true).order('sort'),
        anon.from('station_hours').select('date, hours').eq('campus_id', id).order('date'),
        anon.from('slots').select('*').eq('campus_id', id).order('date'),
      ])
      return {
        campus: campus as Campus,
        catalog: catalog.data ?? [],
        fees: fees.data ?? [],
        insurance: insurance.data ?? buSeed.insurance,
        calendar: calendar.data ?? [],
        locations: locations.data ?? [],
        station_hours: hours.data ?? [],
        slots: slots.data ?? [],
      }
    }
  }
  if (slug === buSeed.campus.slug) return buSeed
  const other = otherCampuses.find((c) => c.slug === slug)
  if (!other) return null
  return { ...buSeed, campus: other, catalog: [], locations: [], station_hours: [], calendar: [] }
}

export const defaultCampusSlug = buSeed.campus.slug

export const calendarDate = (data: CampusData, key: string) => data.calendar.find((c) => c.key === key)
