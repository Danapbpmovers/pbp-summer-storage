'use client'
import { useCallback, useState } from 'react'
import { money } from '@/lib/format'
import { browserClient } from '@/lib/supabase/browser'
import Scanner from './Scanner'
import { addUnbookedItem, attachPhoto, logException, lookup, markReceived, type CrewItem } from './actions'

// Phone-first intake screen for move-out stations and the warehouse.
// Big targets, high contrast, one item at a time.

async function shrink(file: File): Promise<Blob> {
  const img = await createImageBitmap(file)
  const scale = Math.min(1, 1600 / Math.max(img.width, img.height))
  const c = document.createElement('canvas')
  c.width = Math.round(img.width * scale); c.height = Math.round(img.height * scale)
  c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height)
  return new Promise((res) => c.toBlob((b) => res(b ?? file), 'image/jpeg', 0.8))
}

export default function CrewApp({ staffName }: { staffName: string }) {
  const [scanning, setScanning] = useState(false)
  const [code, setCode] = useState('')
  const [item, setItem] = useState<CrewItem | null>(null)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null)
  const [form, setForm] = useState({ weight: '', bin: '', actualName: '', note: '' })
  const [addId, setAddId] = useState('')
  const [recent, setRecent] = useState<{ code: string; name: string }[]>([])

  const open = useCallback(async (raw: string) => {
    setScanning(false); setBusy(true); setMsg(null)
    try {
      const r = await lookup(raw)
      if (!r.ok) { setMsg({ kind: 'err', text: r.error }); setItem(null) }
      else {
        setItem(r.item)
        setForm({ weight: r.item.weight_lbs?.toString() ?? '', bin: r.item.warehouse_bin ?? '', actualName: r.item.actual_name ?? '', note: r.item.intake_note ?? '' })
      }
    } catch { setMsg({ kind: 'err', text: 'Lookup failed. Check your connection.' }) }
    setBusy(false)
  }, [])

  const run = async (fn: () => Promise<CrewItem>, ok: string) => {
    setBusy(true); setMsg(null)
    try { setItem(await fn()); setMsg({ kind: 'ok', text: ok }) } catch (e) { setMsg({ kind: 'err', text: (e as Error).message || 'Failed' }) }
    setBusy(false)
  }

  const receive = async () => {
    if (!item) return
    setBusy(true); setMsg(null)
    try {
      const r = await markReceived({ itemId: item.id, ...form })
      setItem(r.item)
      setRecent((x) => [{ code: r.item.label_code, name: r.item.actual_name ?? r.item.name }, ...x].slice(0, 8))
      setMsg({ kind: 'ok', text: r.overweightCents ? `Received. Overweight fee ${money(r.overweightCents)} added.` : 'Received ✓' })
    } catch (e) { setMsg({ kind: 'err', text: (e as Error).message }) }
    setBusy(false)
  }

  const photo = async (file: File | undefined) => {
    if (!file || !item) return
    const sb = browserClient()
    if (!sb) return
    setBusy(true); setMsg(null)
    try {
      const path = `${item.order.id}/${item.id}/${Date.now()}.jpg`
      const { error } = await sb.storage.from('intake-photos').upload(path, await shrink(file), { contentType: 'image/jpeg' })
      if (error) throw new Error('Upload failed. Try again.')
      setItem(await attachPhoto(item.id, path))
      setMsg({ kind: 'ok', text: 'Photo saved ✓' })
    } catch (e) { setMsg({ kind: 'err', text: (e as Error).message }) }
    setBusy(false)
  }

  return (
    <div className="mx-auto min-h-screen max-w-lg bg-white px-4 pb-28 pt-4 text-[17px] text-black">
      <header className="mb-4 flex items-center justify-between">
        <p className="text-xl font-black">Crew intake</p>
        <span className="text-sm text-stone-600">{staffName}</span>
      </header>

      <button type="button" onClick={() => setScanning(true)} className="flex min-h-20 w-full items-center justify-center gap-3 rounded-2xl bg-ink-900 text-2xl font-black text-white active:bg-ink-800">
        <svg className="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden><path d="M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3M7 12h10" /></svg>
        Scan label
      </button>
      <form className="mt-3 flex gap-2" onSubmit={(e) => { e.preventDefault(); if (code.trim()) open(code) }}>
        <label htmlFor="code" className="sr-only">Label code</label>
        <input id="code" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="or type PSS-XXXXXXX" autoCapitalize="characters" autoCorrect="off"
          className="min-h-14 w-full rounded-xl border-2 border-black px-4 font-mono text-lg" />
        <button className="min-h-14 rounded-xl border-2 border-black px-5 font-bold">Go</button>
      </form>

      {msg && <p role={msg.kind === 'err' ? 'alert' : 'status'} className={`mt-4 rounded-xl px-4 py-3 text-lg font-bold ${msg.kind === 'ok' ? 'bg-green-700 text-white' : 'bg-red-700 text-white'}`}>{msg.text}</p>}
      {busy && <p className="mt-4 text-center font-semibold text-stone-600" role="status">Working…</p>}

      {item && (
        <section className="mt-5 space-y-5" aria-label="Item">
          <div className="rounded-2xl border-2 border-black p-4">
            <p className="font-mono text-2xl font-black">{item.label_code}</p>
            <p className="mt-1 text-xl font-bold">{item.actual_name ?? item.name}</p>
            <p className="mt-2">{item.order.student} · #{item.order.order_number}{item.order.phone ? ` · ${item.order.phone}` : ''}</p>
            <p className="mt-1 font-semibold">{item.order.received_count} of {item.order.item_count} items in</p>
            <p className={`mt-2 inline-block rounded-lg px-3 py-1 text-base font-black uppercase ${item.status === 'expected' ? 'bg-gold-500 text-black' : 'bg-green-700 text-white'}`}>{item.status}</p>
            {item.order.balance_cents > 0 && <p className="mt-2 font-bold text-red-700">Balance due {money(item.order.balance_cents)}{item.order.delivery_hold ? ' · HOLD' : ''}</p>}
            {item.exceptions.length > 0 && <p className="mt-2 font-semibold">Logged: {item.exceptions.join(', ').replace(/_/g, ' ')}</p>}
          </div>

          <div>
            <p className="mb-2 font-black">Photos ({item.photos.length})</p>
            <div className="flex gap-2 overflow-x-auto">
              {item.photos.map((p) => <img key={p.path} src={p.url} alt="Intake" className="h-24 w-24 shrink-0 rounded-xl object-cover" />)}
              <label className="flex h-24 w-24 shrink-0 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-black text-sm font-bold">
                <span className="text-3xl leading-none">+</span>Photo
                <input type="file" accept="image/*" capture="environment" className="sr-only" onChange={(e) => photo(e.target.files?.[0])} />
              </label>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div><label htmlFor="w" className="mb-1 block font-bold">Weight (lb)</label><input id="w" inputMode="decimal" value={form.weight} onChange={(e) => setForm({ ...form, weight: e.target.value })} className="min-h-14 w-full rounded-xl border-2 border-black px-3 text-xl" /></div>
            <div><label htmlFor="b" className="mb-1 block font-bold">Bin / location</label><input id="b" value={form.bin} onChange={(e) => setForm({ ...form, bin: e.target.value.toUpperCase() })} className="min-h-14 w-full rounded-xl border-2 border-black px-3 text-xl" /></div>
          </div>
          <div><label htmlFor="n" className="mb-1 block font-bold">Actually is (if different)</label><input id="n" value={form.actualName} onChange={(e) => setForm({ ...form, actualName: e.target.value })} placeholder={item.name} className="min-h-14 w-full rounded-xl border-2 border-black px-3" /></div>
          <div><label htmlFor="nt" className="mb-1 block font-bold">Note (damage on arrival, etc.)</label><input id="nt" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} className="min-h-14 w-full rounded-xl border-2 border-black px-3" /></div>
          {parseFloat(form.weight) > 50 && <p className="rounded-xl bg-gold-500 px-4 py-2 font-bold">Over 50 lb: an overweight fee will be added.</p>}

          {item.fees.length > 0 && (
            <div>
              <p className="mb-2 font-black">Add fee</p>
              <div className="grid grid-cols-2 gap-2">
                {item.fees.map((f) => {
                  const done = item.exceptions.includes(f.code)
                  return (
                    <button key={f.code} type="button" disabled={busy || done} onClick={() => run(() => logException(item.id, f.code), `${f.name} added`)}
                      className="min-h-14 rounded-xl border-2 border-black px-2 font-bold disabled:border-stone-300 disabled:text-stone-400">
                      {done ? '✓ ' : ''}{f.name.replace(/ – per item/, '')}<span className="block text-sm font-semibold">{money(f.amount_cents)}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          <details className="rounded-xl border-2 border-stone-300 p-3">
            <summary className="cursor-pointer font-black">Student brought an item that isn’t booked</summary>
            <div className="mt-3 space-y-2">
              <label htmlFor="add" className="sr-only">Item</label>
              <select id="add" value={addId} onChange={(e) => setAddId(e.target.value)} className="min-h-14 w-full rounded-xl border-2 border-black px-3">
                <option value="">Choose item…</option>
                {item.catalog.map((c) => <option key={c.id} value={c.id}>{c.name}: {money(c.price_cents)}</option>)}
              </select>
              <button type="button" disabled={!addId || busy} onClick={() => run(() => addUnbookedItem(item.order.id, addId), 'Added. Write this new code on the item.')} className="min-h-14 w-full rounded-xl bg-ink-900 font-bold text-white disabled:opacity-40">Add to order & charge</button>
              <p className="text-sm text-stone-600">Creates a new label code and an open charge on the student’s account.</p>
            </div>
          </details>
        </section>
      )}

      {recent.length > 0 && (
        <section className="mt-8">
          <p className="mb-2 font-black">Received this session</p>
          <ul className="divide-y divide-stone-200 rounded-xl border border-stone-300">{recent.map((r, i) => <li key={`${r.code}-${i}`} className="flex justify-between px-3 py-2"><span className="font-mono">{r.code}</span><span className="truncate pl-3 text-stone-600">{r.name}</span></li>)}</ul>
        </section>
      )}

      {item && item.status === 'expected' && (
        <div className="fixed inset-x-0 bottom-0 border-t-2 border-black bg-white p-3">
          <button type="button" disabled={busy} onClick={receive} className="mx-auto block min-h-16 w-full max-w-lg rounded-2xl bg-green-700 text-2xl font-black text-white active:bg-green-800 disabled:opacity-50">Mark received</button>
        </div>
      )}

      {scanning && <Scanner onCode={open} onClose={() => setScanning(false)} />}
    </div>
  )
}
