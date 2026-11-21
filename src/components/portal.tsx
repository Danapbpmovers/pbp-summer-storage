'use client'
import { useState } from 'react'
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
