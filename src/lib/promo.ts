import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Promo } from './pricing'

export async function findPromo(db: SupabaseClient, code: string, campusId: string): Promise<{ ok: true; promo: Promo } | { ok: false; error: string }> {
  const { data } = await db.from('promo_codes').select('*').ilike('code', code).eq('active', true).maybeSingle()
  if (!data) return { ok: false, error: 'That promo code isn’t valid.' }
  if (data.campus_id && data.campus_id !== campusId) return { ok: false, error: 'That code isn’t valid for this school.' }
  if (data.expires_on && data.expires_on < new Date().toISOString().slice(0, 10)) return { ok: false, error: 'That code has expired.' }
  if (data.max_uses && data.uses >= data.max_uses) return { ok: false, error: 'That code has been fully used.' }
  return { ok: true, promo: { code: data.code, percent_off: data.percent_off, amount_off_cents: data.amount_off_cents } }
}
