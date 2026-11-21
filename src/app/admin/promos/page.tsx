import { serverClient } from '@/lib/supabase/server'
import { money, shortDay, todayIso } from '@/lib/format'
import { togglePromo } from '../actions'
import PromoForm from './PromoForm'

export default async function AdminPromos() {
  const sb = (await serverClient())!
  const [{ data: promos }, { data: campuses }] = await Promise.all([
    sb.from('promo_codes').select('*, campuses(short_name)').order('active', { ascending: false }).order('code'),
    sb.from('campuses').select('id, name').order('sort'),
  ])
  const today = todayIso()
  return (
    <>
      <h1 className="h2">Promo codes</h1>
      <p className="mt-2 text-stone-600">Discounts apply to storage and Ship Ahead items, not fees or coverage. Customers enter codes on the last booking step.</p>
      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_1.6fr]">
        <PromoForm campuses={campuses ?? []} />
        <section className="panel overflow-x-auto">
          <table className="tbl">
            <thead><tr><th>Code</th><th>Discount</th><th>School</th><th>Used</th><th>Expires</th><th /></tr></thead>
            <tbody>
              {(promos ?? []).map((p) => {
                const expired = p.expires_on && p.expires_on < today
                const full = p.max_uses && p.uses >= p.max_uses
                return (
                  <tr key={p.id} className={p.active && !expired && !full ? '' : 'text-stone-400'}>
                    <td className="font-mono font-semibold">{p.code}</td>
                    <td>{p.percent_off ? `${p.percent_off}%` : money(p.amount_off_cents)}</td>
                    <td>{(p.campuses as { short_name: string } | null)?.short_name ?? 'All'}</td>
                    <td>{p.uses}{p.max_uses ? ` / ${p.max_uses}` : ''}</td>
                    <td>{p.expires_on ? shortDay(p.expires_on) : '—'}{expired && ' (expired)'}</td>
                    <td>
                      <form action={togglePromo}>
                        <input type="hidden" name="id" value={p.id} /><input type="hidden" name="active" value={String(!p.active)} />
                        <button className="btn-outline btn-sm">{p.active ? 'Turn off' : 'Turn on'}</button>
                      </form>
                    </td>
                  </tr>
                )
              })}
              {!promos?.length && <tr><td colSpan={6} className="text-stone-500">No codes yet.</td></tr>}
            </tbody>
          </table>
        </section>
      </div>
    </>
  )
}
