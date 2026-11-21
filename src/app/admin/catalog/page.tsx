import { cardPrice } from '@/config/site'
import { serverClient } from '@/lib/supabase/server'
import { money } from '@/lib/format'
import { categoryLabels } from '@/lib/types'
import { addCatalogItem, savePrice } from '../actions'

export default async function AdminCatalog({ searchParams }: { searchParams: Promise<{ campus?: string }> }) {
  const sb = (await serverClient())!
  const { data: campuses } = await sb.from('campuses').select('id, slug, name').order('sort')
  const { campus: slug } = await searchParams
  const campus = campuses?.find((c) => c.slug === slug) ?? campuses?.[0]
  if (!campus) return <p>No campuses yet. Run the seed SQL.</p>
  const [{ data: items }, { data: fees }] = await Promise.all([
    sb.from('catalog_items').select('*').eq('campus_id', campus.id).order('category').order('sort'),
    sb.from('fee_rules').select('*').eq('campus_id', campus.id).order('sort'),
  ])
  const Row = ({ id, name, price, active, table }: { id: string; name: string; price: number; active: boolean; table: 'item' | 'fee' }) => (
    <form action={savePrice} className="grid grid-cols-[1fr_100px_auto_auto] items-center gap-2 border-b border-stone-100 py-2">
      <input type="hidden" name="id" value={id} /><input type="hidden" name="table" value={table} />
      <input name="name" defaultValue={name} className="input min-h-9 py-1" aria-label="Name" />
      <input name="price" defaultValue={(price / 100).toFixed(2)} inputMode="decimal" className="input min-h-9 py-1 text-right" aria-label="Bank price" />
      <label className="flex items-center gap-1 text-xs"><input type="checkbox" name="active" defaultChecked={active} className="accent-ink-900" />On</label>
      <button className="btn-outline btn-sm">Save</button>
      <span className="col-span-4 -mt-1 text-xs text-stone-500">Card price {money(cardPrice(price))}</span>
    </form>
  )
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="h2">Prices</h1>
        <form className="flex gap-2"><select name="campus" defaultValue={campus.slug} className="input">{campuses!.map((c) => <option key={c.id} value={c.slug}>{c.name}</option>)}</select><button className="btn-outline btn-sm">Go</button></form>
      </div>
      <p className="mt-2 text-stone-600">Enter bank-transfer (actual) prices. The card price (+3%) is calculated automatically. Changes go live on the site within a few minutes.</p>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="panel">
          <h2 className="h3">Catalog</h2>
          {Object.entries(categoryLabels).map(([cat, label]) => {
            const rows = (items ?? []).filter((i) => i.category === cat)
            return (
              <div key={cat} className="mt-4">
                <h3 className="text-sm font-bold uppercase tracking-wide text-stone-500">{label}</h3>
                {rows.map((i) => <Row key={i.id} id={i.id} name={i.name} price={i.price_cents} active={i.active} table="item" />)}
                {!rows.length && <p className="py-2 text-sm text-stone-500">None yet.</p>}
              </div>
            )
          })}
          <form action={addCatalogItem} className="mt-6 grid gap-2 border-t border-stone-200 pt-4 sm:grid-cols-[150px_1fr_100px_auto]">
            <input type="hidden" name="campus_id" value={campus.id} />
            <select name="category" className="input" defaultValue="supplies" aria-label="Category">{Object.entries(categoryLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
            <input name="name" required placeholder="e.g. Medium moving box" className="input" />
            <input name="price" required placeholder="$" inputMode="decimal" className="input" />
            <button className="btn-dark btn-sm">Add</button>
          </form>
        </section>
        <section className="panel h-fit">
          <h2 className="h3">Fees</h2>
          {(fees ?? []).map((f) => <Row key={f.id} id={f.id} name={f.name} price={f.amount_cents} active={f.active} table="fee" />)}
        </section>
      </div>
    </>
  )
}
