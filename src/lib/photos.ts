import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'

/** Signed URLs (1 hour) for private photos the current user is allowed to see. */
export async function signPhotos(sb: SupabaseClient, bucket: 'intake-photos' | 'claim-photos', paths: string[]) {
  if (!paths.length) return {} as Record<string, string>
  const { data } = await sb.storage.from(bucket).createSignedUrls(paths, 3600)
  return Object.fromEntries((data ?? []).filter((d) => d.signedUrl).map((d) => [d.path, d.signedUrl])) as Record<string, string>
}
