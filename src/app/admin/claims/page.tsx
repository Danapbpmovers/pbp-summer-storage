import Link from 'next/link'
import { serverClient } from '@/lib/supabase/server'
import { signPhotos } from '@/lib/photos'
import { money, shortDay } from '@/lib/format'
import { updateClaim } from '../actions'

const statuses = ['submitted', 'reviewing', 'approved', 'denied', 'paid'] as const

export default async function AdminClaims({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status = 'open' } = await searchParams
  const sb = (await serverClient())!
  let q = sb.from('claims').select('*, orders(id, order_number, student_first_name, student_last_name, declared_value_cents, delivered_at), order_items(label_code, name, actual_name, photos)').order('created_at', { ascending: true })
  q = status === 'open' ? q.in('status', ['submitted', 'reviewing', 'approved']) : status === 'all' ? q : q.eq('status', status)
  const { data: claims } = await q
  const claimUrls = await signPhotos(sb, 'claim-photos', (claims ?? []).flatMap((c) => c.photos ?? []))
  const intakePaths = (claims ?? []).flatMap((c) => ((c.order_items as { photos: string[] } | null)?.photos ?? []))
  const intakeUrls = await signPhotos(sb, 'intake-photos', intakePaths)

  return (
    <>
      <h1 className="h2">Claims</h1>
      <nav className="mt-4 flex flex-wrap gap-2 text-sm" aria-label="Filter">
        {['open', ...statuses, 'all'].map((s) => (
          <Link key={s} href={`/admin/claims?status=${s}`} className={`rounded-full border px-3 py-1 font-semibold capitalize ${s === status ? 'border-ink-900 bg-ink-900 text-white' : 'border-stone-300 bg-white'}`}>{s}</Link>
        ))}
      </nav>
      <div className="mt-6 space-y-5">
        {(claims ?? []).map((c) => {
          const o = c.orders as { id: string; order_number: number; student_first_name: string; student_last_name: string; declared_value_cents: number; delivered_at: string | null }
          const it = c.order_items as { label_code: string; name: string; actual_name: string | null; photos: string[] } | null
          return (
            <article key={c.id} className="panel">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm text-stone-500">Filed {shortDay(c.created_at)} · <Link href={`/admin/orders/${o.id}`} className="font-semibold text-pbp-700 underline">#{o.order_number}</Link> {o.student_first_name} {o.student_last_name}</p>
                  <p className="mt-1 font-semibold text-ink-900">{c.description}</p>
                  <p className="mt-1 text-sm text-stone-600">
                    {it ? `${it.label_code} · ${it.actual_name ?? it.name}` : 'No specific item'} · claimed {c.amount_claimed_cents ? money(c.amount_claimed_cents) : '—'} · coverage ${(o.declared_value_cents / 100).toLocaleString()}
                    {o.delivered_at ? ` · delivered ${shortDay(o.delivered_at)}` : ''}
                  </p>
                </div>
                <span className="badge bg-sand-100 capitalize text-ink-800">{c.status}</span>
              </div>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div>
                  <p className="text-xs font-bold uppercase text-stone-500">Customer photos</p>
                  <div className="mt-1 flex flex-wrap gap-2">{(c.photos ?? []).map((p: string) => claimUrls[p] && <a key={p} href={claimUrls[p]} target="_blank" rel="noreferrer"><img src={claimUrls[p]} alt="Claim" className="h-20 w-20 rounded-lg object-cover" /></a>)}{!c.photos?.length && <span className="text-sm text-stone-500">None</span>}</div>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase text-stone-500">Intake photos (at drop-off)</p>
                  <div className="mt-1 flex flex-wrap gap-2">{(it?.photos ?? []).map((p) => intakeUrls[p] && <a key={p} href={intakeUrls[p]} target="_blank" rel="noreferrer"><img src={intakeUrls[p]} alt="Intake" className="h-20 w-20 rounded-lg object-cover" /></a>)}{!it?.photos?.length && <span className="text-sm text-stone-500">None</span>}</div>
                </div>
              </div>
              <form action={updateClaim} className="mt-5 grid gap-3 border-t border-stone-100 pt-4 sm:grid-cols-[160px_140px_1fr]">
                <input type="hidden" name="id" value={c.id} />
                <select name="status" defaultValue={c.status} className="input capitalize" aria-label="Status">{statuses.map((s) => <option key={s} value={s}>{s}</option>)}</select>
                <input name="approved" defaultValue={c.approved_cents != null ? (c.approved_cents / 100).toFixed(2) : ''} placeholder="$ approved" inputMode="decimal" className="input" aria-label="Approved amount" />
                <input name="resolution" defaultValue={c.resolution ?? ''} placeholder="Note to customer (shown in their account)" className="input" />
                <label className="flex items-center gap-2 text-sm sm:col-span-2"><input type="checkbox" name="notify" defaultChecked className="h-4 w-4 accent-ink-900" />Email the customer if status changes</label>
                <button className="btn-dark btn-sm justify-self-start">Save</button>
              </form>
            </article>
          )
        })}
        {!claims?.length && <p className="text-stone-600">No claims here.</p>}
      </div>
    </>
  )
}
