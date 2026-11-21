'use client'
import { useEffect, useState } from 'react'
import { payments } from '@/config/site'
import { money } from '@/lib/format'
import type { CalendarWindow } from '@/lib/types'

export function PayButtons({ chargeId, description, amountCents, method, cardFeeCents }: { chargeId: string; description: string; amountCents: number; method: 'ach' | 'card'; cardFeeCents: number }) {
  const ach = method === 'card' ? amountCents - cardFeeCents : amountCents
  const card = Math.round(ach * (1 + payments.cardFeePercent / 100))
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const pay = async (m: 'ach' | 'card') => {
    setBusy(true); setErr('')
    const r = await fetch('/api/pay', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ chargeId, method: m }) })
    const j = await r.json().catch(() => ({}))
    if (r.ok && j.url) window.location.href = j.url
    else { setErr(j.error ?? 'Payment couldn’t start.'); setBusy(false) }
  }
  return (
    <div className="mt-4 rounded-xl border border-gold-500/50 bg-gold-100 p-4">
      <p className="font-semibold text-ink-900">Due: {description}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button className="btn-dark btn-sm" disabled={busy} onClick={() => pay('ach')}>Pay {money(ach)} by bank</button>
        <button className="btn-outline btn-sm" disabled={busy} onClick={() => pay('card')}>Pay {money(card)} by card</button>
      </div>
      {err && <p role="alert" className="mt-2 text-sm font-semibold text-red-700">{err}</p>}
    </div>
  )
}

export function DeliveryRequestForm({ orderId, method, hall, address, window: win }: { orderId: string; method: string; hall: string; address: string; window: CalendarWindow | null }) {
  const [m, setM] = useState(method === 'undecided' ? 'on_campus' : method)
  const [date, setDate] = useState('')
  const [slot, setSlot] = useState('9am – 12pm')
  const [h, setH] = useState(hall)
  const [a, setA] = useState(address)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  return (
    <form className="mt-4 space-y-3 border-t border-stone-100 pt-4" onSubmit={async (e) => {
      e.preventDefault(); setBusy(true); setErr('')
      const r = await fetch('/api/orders/delivery', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ orderId, method: m, date, window: slot, hall: h, address: a }) })
      const j = await r.json().catch(() => ({}))
      if (r.ok) window.location.href = `/app/orders/${orderId}?requested=1`
      else { setErr(j.error ?? 'Couldn’t submit.'); setBusy(false) }
    }}>
      <p className="text-sm font-bold text-ink-900">Request delivery</p>
      <select className="input" value={m} onChange={(e) => setM(e.target.value)} aria-label="Delivery type">
        <option value="on_campus">On campus (Move-In Station)</option>
        <option value="off_campus">Off-campus address</option>
        <option value="ship">Ship to me</option>
      </select>
      <div className="grid grid-cols-2 gap-2">
        <div><label htmlFor="dd" className="label">Date</label><input id="dd" type="date" required className="input" min={win?.starts_on} value={date} onChange={(e) => setDate(e.target.value)} /></div>
        <div><label htmlFor="dw" className="label">Time</label>
          <select id="dw" className="input" value={slot} onChange={(e) => setSlot(e.target.value)}>
            {['9am – 12pm', '12pm – 3pm', '3pm – 5pm', '5pm – 7pm (evening fee)'].map((w) => <option key={w}>{w}</option>)}
          </select>
        </div>
      </div>
      {m === 'on_campus' ? (
        <div><label htmlFor="dh" className="label">Residence hall</label><input id="dh" className="input" required value={h} onChange={(e) => setH(e.target.value)} /></div>
      ) : (
        <div><label htmlFor="da" className="label">Address</label><input id="da" className="input" required value={a} onChange={(e) => setA(e.target.value)} /></div>
      )}
      {err && <p role="alert" className="text-sm font-semibold text-red-700">{err}</p>}
      <button className="btn-dark w-full" disabled={busy}>{busy ? 'Sending…' : 'Request delivery'}</button>
      <p className="hint">Any fees (off-campus, weekend, evening or late request) are added to your charges, and you’ll see them before paying.</p>
    </form>
  )
}

export function InviteForm() {
  const [email, setEmail] = useState('')
  const [perm, setPerm] = useState({ can_pay: true, can_schedule: true })
  const [msg, setMsg] = useState('')
  return (
    <form className="space-y-3" onSubmit={async (e) => {
      e.preventDefault(); setMsg('')
      const r = await fetch('/api/collaborators', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email, ...perm }) })
      const j = await r.json().catch(() => ({}))
      if (r.ok) { setMsg(`Invited ${email}.`); setEmail(''); window.location.reload() } else setMsg(j.error ?? 'Couldn’t invite.')
    }}>
      <div><label htmlFor="inv" className="label">Email</label><input id="inv" type="email" required className="input" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
      <div className="flex flex-wrap gap-4 text-sm">
        <label className="flex items-center gap-2"><input type="checkbox" className="h-4 w-4 accent-ink-900" checked={perm.can_pay} onChange={(e) => setPerm({ ...perm, can_pay: e.target.checked })} />Can pay</label>
        <label className="flex items-center gap-2"><input type="checkbox" className="h-4 w-4 accent-ink-900" checked={perm.can_schedule} onChange={(e) => setPerm({ ...perm, can_schedule: e.target.checked })} />Can schedule</label>
      </div>
      <button className="btn-dark btn-sm">Send invite</button>
      {msg && <p role="status" className="text-sm text-stone-700">{msg}</p>}
    </form>
  )
}

export function ClaimForm({ orderId, items, deadline, windowDays }: { orderId: string; items: { id: string; label: string }[]; deadline: string | null; windowDays: number }) {
  const [open, setOpen] = useState(false)
  const [itemId, setItemId] = useState('')
  const [kind, setKind] = useState<'damaged' | 'missing'>('damaged')
  const [desc, setDesc] = useState('')
  const [amount, setAmount] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  if (!open) {
    return (
      <div className="mt-4 rounded-xl border border-stone-200 bg-sand-50 p-4">
        <p className="text-sm text-stone-700">Something damaged or missing? Report it {deadline ? `by ${deadline}` : `within ${windowDays} days of delivery`}. Keep the item, box and packing materials.</p>
        <button type="button" className="btn-outline btn-sm mt-3" onClick={() => setOpen(true)}>Report damage or loss</button>
      </div>
    )
  }
  return (
    <form className="mt-4 space-y-4 rounded-xl border border-stone-200 bg-white p-5" onSubmit={async (e) => {
      e.preventDefault(); setErr('')
      if (desc.trim().length < 10) { setErr('Please describe what happened.'); return }
      if (kind === 'damaged' && files.length === 0) { setErr('Add at least one photo of the damage.'); return }
      setBusy(true)
      try {
        const { browserClient } = await import('@/lib/supabase/browser')
        const sb = browserClient()
        const paths: string[] = []
        for (const f of files.slice(0, 6)) {
          const path = `${orderId}/claims/${Date.now()}-${paths.length}.${(f.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '')}`
          const { error } = await sb!.storage.from('claim-photos').upload(path, f, { contentType: f.type || 'image/jpeg' })
          if (error) throw new Error('A photo failed to upload. Please try again.')
          paths.push(path)
        }
        const r = await fetch('/api/claims', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ orderId, itemId: itemId || null, kind, description: desc, amount, photos: paths }) })
        const j = await r.json().catch(() => ({}))
        if (!r.ok) throw new Error(j.error ?? 'Couldn’t file the claim.')
        window.location.href = `/app/orders/${orderId}#claims`
        window.location.reload()
      } catch (e2) { setErr((e2 as Error).message); setBusy(false) }
    }}>
      <p className="font-bold text-ink-900">Report damage or loss</p>
      <div className="flex gap-2" role="radiogroup" aria-label="Type">
        {(['damaged', 'missing'] as const).map((k) => (
          <button key={k} type="button" role="radio" aria-checked={kind === k} onClick={() => setKind(k)} className={`rounded-lg border px-4 py-2 text-sm font-semibold capitalize ${kind === k ? 'border-ink-900 bg-ink-900 text-white' : 'border-stone-300'}`}>{k}</button>
        ))}
      </div>
      <div><label htmlFor="cl-item" className="label">Which item?</label>
        <select id="cl-item" className="input" value={itemId} onChange={(e) => setItemId(e.target.value)}>
          <option value="">Not sure / more than one</option>
          {items.map((i) => <option key={i.id} value={i.id}>{i.label}</option>)}
        </select>
      </div>
      <div><label htmlFor="cl-desc" className="label">What happened?</label><textarea id="cl-desc" rows={4} className="input" value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Describe the damage or what’s missing, and what was inside." /></div>
      <div><label htmlFor="cl-amt" className="label">Value or repair cost ($)</label><input id="cl-amt" inputMode="decimal" className="input max-w-[200px]" value={amount} onChange={(e) => setAmount(e.target.value)} /><p className="hint">We may ask for a receipt or repair estimate.</p></div>
      <PhotoPicker label={`Photos ${kind === 'damaged' ? '(required)' : '(optional)'}`} files={files} setFiles={setFiles} max={6} hint="The damage, the box and the label. Up to 6 photos." />
      {err && <p role="alert" className="text-sm font-semibold text-red-700">{err}</p>}
      <div className="flex gap-2">
        <button className="btn-dark" disabled={busy}>{busy ? 'Sending…' : 'Submit claim'}</button>
        <button type="button" className="btn-outline" onClick={() => setOpen(false)}>Cancel</button>
      </div>
    </form>
  )
}

/** Photo picker with thumbnails, remove buttons and an add tile. Keeps previously chosen photos when adding more. */
export function PhotoPicker({ label, files, setFiles, max, hint }: { label: string; files: File[]; setFiles: (f: File[]) => void; max: number; hint?: string }) {
  const [urls, setUrls] = useState<string[]>([])
  useEffect(() => {
    const u = files.map((f) => URL.createObjectURL(f))
    setUrls(u)
    return () => u.forEach((x) => URL.revokeObjectURL(x))
  }, [files])
  return (
    <fieldset>
      <legend className="label">{label}</legend>
      <ul className="flex flex-wrap gap-3" aria-label="Chosen photos">
        {files.map((f, i) => (
          <li key={`${f.name}-${f.lastModified}-${i}`} className="relative">
            {urls[i] && <img src={urls[i]} alt={`Photo ${i + 1}: ${f.name}`} className="h-24 w-24 rounded-xl border border-stone-200 object-cover" />}
            <button type="button" onClick={() => setFiles(files.filter((_, j) => j !== i))} aria-label={`Remove photo ${i + 1}`}
              className="absolute -right-2 -top-2 flex h-7 w-7 items-center justify-center rounded-full bg-ink-900 text-base font-bold leading-none text-white shadow ring-2 ring-white hover:bg-red-700">×</button>
          </li>
        ))}
        {files.length < max && (
          <li>
            <label className="flex h-24 w-24 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-stone-300 text-sm font-semibold text-stone-600 hover:border-ink-700 hover:text-ink-900 focus-within:ring-2 focus-within:ring-gold-400">
              <span className="text-2xl leading-none" aria-hidden>+</span>
              {files.length ? 'Add more' : 'Add photos'}
              <input type="file" accept="image/*" multiple className="sr-only"
                onChange={(e) => { setFiles([...files, ...Array.from(e.target.files ?? [])].slice(0, max)); e.target.value = '' }} />
            </label>
          </li>
        )}
      </ul>
      <p className="hint mt-2">{hint} {files.length > 0 && `${files.length} of ${max} chosen.`}</p>
    </fieldset>
  )
}
