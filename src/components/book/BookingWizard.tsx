'use client'
import Link from 'next/link'
import { useEffect, useMemo, useRef, useState } from 'react'
import { payments, referralSources } from '@/config/site'
import { addDays, day, inWindow, money, shortDay, todayIso } from '@/lib/format'
import { applyPaymentMethod, quote, type PayMethod, type Promo } from '@/lib/pricing'
import type { Campus, CampusData } from '@/lib/types'
import { CartSummary, CoverageInput, ItemPicker, PayMethodToggle, Stepper } from '@/components/cart'

export interface WizardState {
  campus: string
  service: 'storage' | 'ship_ahead'
  booked_by: 'student' | 'parent'
  student: { first_name: string; last_name: string; email: string; phone: string; student_id: string; class_year: string }
  parent: { name: string; email: string; phone: string }
  password: string
  referral_source: string
  sms_consent: boolean
  marketing_consent: boolean
  terms: boolean
  items: Record<string, number>
  reserve_only: boolean
  ship_ahead_count: number
  ship_ahead_oversize: number
  declared_value_cents: number
  dropoff_method: 'station' | 'curbside' | 'undecided'
  dropoff_location_id: string
  dropoff_slot_id: string
  dropoff_date: string
  dropoff_window: string
  dropoff_address: string
  return_method: 'on_campus' | 'off_campus' | 'ship' | 'extended' | 'undecided'
  return_hall: string
  return_address: string
  early_withdrawal: boolean
  proxy_name: string
  proxy_phone: string
  notes: string
  promo_code: string
  pay_method: PayMethod
}

const blank = (campus: string, bookedBy: 'student' | 'parent', service: 'storage' | 'ship_ahead'): WizardState => ({
  campus, service, booked_by: bookedBy,
  student: { first_name: '', last_name: '', email: '', phone: '', student_id: '', class_year: '' },
  parent: { name: '', email: '', phone: '' },
  password: '', referral_source: '', sms_consent: false, marketing_consent: false, terms: false,
  items: {}, reserve_only: false, ship_ahead_count: 0, ship_ahead_oversize: 0, declared_value_cents: 30000,
  dropoff_method: service === 'ship_ahead' ? 'undecided' : 'station', dropoff_location_id: '', dropoff_slot_id: '', dropoff_date: '', dropoff_window: '', dropoff_address: '',
  return_method: 'on_campus', return_hall: '', return_address: '', early_withdrawal: false,
  proxy_name: '', proxy_phone: '', notes: '', promo_code: '', pay_method: payments.defaultMethod,
})

const STORAGE_KEY = 'pss-booking-v1'
const steps = ['School', 'You', 'Items', 'Coverage', 'Schedule', 'Review & pay'] as const

interface Props {
  campuses: Campus[]
  data: CampusData
  initial: { campus: string; as: 'student' | 'parent'; service: 'storage' | 'ship_ahead'; items: Record<string, number> }
  signedIn: { email: string; first_name: string; last_name: string; phone: string } | null
  backendReady: boolean
}

export default function BookingWizard({ campuses, data, initial, signedIn, backendReady }: Props) {
  const [s, setS] = useState<WizardState>(() => {
    const b = blank(initial.campus, initial.as, initial.service)
    b.items = initial.items
    b.declared_value_cents = data.insurance.included_cents
    if (signedIn) b.student = { ...b.student, email: signedIn.email, first_name: signedIn.first_name, last_name: signedIn.last_name, phone: signedIn.phone }
    return b
  })
  const [step, setStep] = useState(0)
  const [errors, setErrors] = useState<string[]>([])
  const [promo, setPromo] = useState<Promo | null>(null)
  const [promoMsg, setPromoMsg] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const headingRef = useRef<HTMLHeadingElement>(null)
  const loaded = useRef(false)

  // Resume a saved draft for the same campus (never the password).
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const saved = JSON.parse(raw) as { s: WizardState; step: number }
        if (saved.s.campus === initial.campus && Object.keys(initial.items).length === 0) {
          setS((cur) => ({ ...cur, ...saved.s, password: '', booked_by: initial.as === 'parent' ? 'parent' : saved.s.booked_by }))
          setStep(Math.min(saved.step, 4))
        }
      }
    } catch { /* storage unavailable */ }
    loaded.current = true
  }, [initial])

  useEffect(() => {
    if (!loaded.current) return
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ s: { ...s, password: '' }, step })) } catch { /* ignore */ }
  }, [s, step])

  // Move focus to the new step's heading for screen readers, but not on first load.
  const firstStep = useRef(true)
  useEffect(() => {
    if (firstStep.current) { firstStep.current = false; return }
    headingRef.current?.focus({ preventScroll: true })
  }, [step])

  const set = <K extends keyof WizardState>(k: K, v: WizardState[K]) => setS((cur) => ({ ...cur, [k]: v }))
  const setStudent = (k: keyof WizardState['student'], v: string) => setS((cur) => ({ ...cur, student: { ...cur.student, [k]: v } }))
  const setParent = (k: keyof WizardState['parent'], v: string) => setS((cur) => ({ ...cur, parent: { ...cur.parent, [k]: v } }))

  const q = useMemo(() => quote(data, {
    service: s.service, items: s.items, ship_ahead_count: s.ship_ahead_count, ship_ahead_oversize: s.ship_ahead_oversize,
    declared_value_cents: s.declared_value_cents, dropoff_method: s.dropoff_method, dropoff_date: s.dropoff_date || null, return_method: s.return_method,
  }, promo), [data, s, promo])

  const tz = data.campus.timezone
  const minCurbside = addDays(todayIso(tz), 3)
  const peak = data.calendar.find((c) => c.key === 'peak_move_out')
  const stations = data.locations.filter((l) => l.type === 'move_out_station' || l.type === 'store')
  const slots = (data.slots ?? []).filter((x) => x.date >= todayIso(tz))
  const stationSlots = slots.filter((x) => x.kind === 'station_dropoff' && x.location_id === s.dropoff_location_id)
  const curbSlots = slots.filter((x) => x.kind === 'curbside_pickup' && x.date >= minCurbside)
  const curbDates = Array.from(new Set(curbSlots.map((x) => x.date)))

  function validate(i: number): string[] {
    const e: string[] = []
    if (i === 1) {
      const st = s.student
      if (!st.first_name.trim() || !st.last_name.trim()) e.push('Student first and last name are required.')
      if (!/^\S+@\S+\.\S+$/.test(st.email)) e.push('Enter a valid student email.')
      if (st.phone.replace(/\D/g, '').length < 10) e.push('Enter a 10-digit student phone number.')
      if (s.booked_by === 'parent') {
        if (!s.parent.name.trim()) e.push('Parent name is required.')
        if (!/^\S+@\S+\.\S+$/.test(s.parent.email)) e.push('Enter a valid parent email.')
      }
      if (!signedIn && s.password.length < 8) e.push('Choose a password with at least 8 characters.')
      if (!s.terms) e.push('Please accept the terms to continue.')
    }
    if (i === 2) {
      const stored = s.service === 'storage' ? q.item_count : s.ship_ahead_count
      if (!s.reserve_only && stored === 0) e.push(s.service === 'storage' ? 'Add at least one item, or choose “I’m not sure yet”.' : 'Enter how many items you’ll ship.')
    }
    if (i === 4 && s.service === 'storage' && !s.reserve_only) {
      if (s.dropoff_method === 'station') {
        if (!s.dropoff_location_id) e.push('Choose a station.')
        else if (stationSlots.length > 0 && !s.dropoff_slot_id) e.push('Choose a drop-off day.')
      }
      if (s.dropoff_method === 'curbside') {
        if (!s.dropoff_date) e.push('Choose a pickup date.')
        else if (s.dropoff_date < minCurbside) e.push('Curbside pickups need at least 3 days’ notice.')
        if (!s.dropoff_window) e.push('Choose a pickup time window.')
        if (!s.dropoff_address.trim()) e.push('Enter the pickup address.')
      }
      if (s.return_method === 'ship' && !s.return_address.trim()) e.push('Enter the shipping address.')
    }
    return e
  }

  function next() {
    const e = validate(step)
    setErrors(e)
    if (e.length) return
    setStep((x) => Math.min(x + 1, steps.length - 1))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  const back = () => { setErrors([]); setStep((x) => Math.max(0, x - 1)) }

  async function applyPromo() {
    setPromoMsg('')
    if (!s.promo_code.trim()) { setPromo(null); return }
    const r = await fetch(`/api/promo?code=${encodeURIComponent(s.promo_code.trim())}&campus=${s.campus}`)
    const j = await r.json().catch(() => ({}))
    if (r.ok) { setPromo(j.promo); setPromoMsg('Promo applied.') } else { setPromo(null); setPromoMsg(j.error ?? 'That code isn’t valid.') }
  }

  async function submit() {
    const e = [1, 2, 4].flatMap(validate)
    if (e.length) { setErrors(e); return }
    setSubmitting(true); setSubmitError('')
    try {
      const r = await fetch('/api/book', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(s) })
      const j = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(j.error ?? 'Something went wrong. Please try again.')
      try { localStorage.removeItem(STORAGE_KEY) } catch { /* ignore */ }
      window.location.href = j.redirect
    } catch (err) {
      setSubmitError((err as Error).message)
      setSubmitting(false)
    }
  }

  const pay = applyPaymentMethod(q.due_now_cents, s.pay_method, payments)

  return (
    <div className="wrap py-8 pb-32 lg:pb-12">
      {/* Progress */}
      <nav aria-label="Booking steps" className="mb-8">
        <ol className="flex gap-1.5">
          {steps.map((label, i) => (
            <li key={label} className="flex-1">
              <button type="button" disabled={i > step} onClick={() => i < step && setStep(i)} className="group w-full text-left disabled:cursor-default" aria-current={i === step ? 'step' : undefined}>
                <span className={`block h-1.5 rounded-full ${i <= step ? 'bg-ink-900' : 'bg-stone-200'}`} />
                <span className={`mt-2 hidden text-xs font-semibold sm:block ${i === step ? 'text-ink-900' : 'text-stone-500'}`}>{i + 1}. {label}</span>
              </button>
            </li>
          ))}
        </ol>
        <p className="mt-2 text-sm text-stone-500 sm:hidden">Step {step + 1} of {steps.length}: {steps[step]}</p>
      </nav>

      <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
        <div>
          <h1 ref={headingRef} tabIndex={-1} className="h2 outline-none focus-visible:outline-none">{[
            'Where are you storing?', 'Who’s booking?', s.service === 'storage' ? 'What are you storing?' : 'What are you shipping ahead?', 'Protect your things', 'Drop-off and return', 'Review and pay',
          ][step]}</h1>

          {errors.length > 0 && (
            <div role="alert" className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              <ul className="list-disc pl-5">{errors.map((x) => <li key={x}>{x}</li>)}</ul>
            </div>
          )}

          <div className="mt-6">
            {step === 0 && (
              <div className="space-y-6">
                <div>
                  <label htmlFor="campus" className="label">School</label>
                  <select id="campus" className="input max-w-md" value={s.campus} onChange={(e) => { window.location.href = `/book?campus=${e.target.value}` }}>
                    {campuses.map((c) => <option key={c.slug} value={c.slug} disabled={!c.bookable}>{c.name}{c.bookable ? '' : ' (coming soon)'}</option>)}
                  </select>
                </div>
                <fieldset>
                  <legend className="label">Service</legend>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {([['storage', 'Summer storage', 'Store your things over the summer and get them back at move-in.'], ['ship_ahead', 'Ship Ahead', 'Ship boxes to our warehouse before you arrive, and we’ll deliver them.']] as const).map(([v, t, b]) => (
                      <label key={v} className={`cursor-pointer rounded-2xl border p-5 ${s.service === v ? 'border-ink-900 bg-sand-50 ring-1 ring-ink-900' : 'border-stone-300 bg-white'}`}>
                        <input type="radio" className="sr-only" name="service" checked={s.service === v} onChange={() => setS((c) => ({ ...c, service: v, dropoff_method: v === 'ship_ahead' ? 'undecided' : 'station' }))} />
                        <span className="block text-lg font-bold text-ink-900">{t}</span>
                        <span className="mt-1 block text-stone-600">{b}</span>
                      </label>
                    ))}
                  </div>
                  <p className="hint mt-3">Shipping home instead? <Link href="/shipping" className="font-semibold text-pbp-700 underline">See shipping</Link>.</p>
                </fieldset>
              </div>
            )}

            {step === 1 && (
              <div className="space-y-6">
                <div className="inline-flex rounded-xl border border-stone-300 bg-white p-1" role="radiogroup" aria-label="I am a">
                  {(['student', 'parent'] as const).map((v) => (
                    <button key={v} type="button" role="radio" aria-checked={s.booked_by === v} onClick={() => set('booked_by', v)}
                      className={`rounded-lg px-5 py-2 text-sm font-semibold ${s.booked_by === v ? 'bg-ink-900 text-white' : 'text-stone-700'}`}>
                      I’m a {v}
                    </button>
                  ))}
                </div>
                {s.booked_by === 'parent' && (
                  <fieldset className="panel">
                    <legend className="px-1 text-sm font-bold text-ink-900">Parent</legend>
                    <div className="grid gap-4 sm:grid-cols-3">
                      <Field id="p-name" label="Your name" value={s.parent.name} onChange={(v) => setParent('name', v)} autoComplete="name" />
                      <Field id="p-email" label="Your email" type="email" value={s.parent.email} onChange={(v) => setParent('email', v)} autoComplete="email" />
                      <Field id="p-phone" label="Your phone" type="tel" value={s.parent.phone} onChange={(v) => setParent('phone', v)} autoComplete="tel" />
                    </div>
                    <p className="hint mt-3">We’ll add you to the student’s account so you can pay, schedule and see item photos.</p>
                  </fieldset>
                )}
                <fieldset className="panel">
                  <legend className="px-1 text-sm font-bold text-ink-900">Student</legend>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field id="s-first" label="First name" value={s.student.first_name} onChange={(v) => setStudent('first_name', v)} autoComplete={s.booked_by === 'student' ? 'given-name' : 'off'} />
                    <Field id="s-last" label="Last name" value={s.student.last_name} onChange={(v) => setStudent('last_name', v)} autoComplete={s.booked_by === 'student' ? 'family-name' : 'off'} />
                    <Field id="s-email" label="Student email" type="email" value={s.student.email} onChange={(v) => setStudent('email', v)} hint="School or personal email" disabled={!!signedIn && s.booked_by === 'student'} />
                    <Field id="s-phone" label="Student mobile" type="tel" value={s.student.phone} onChange={(v) => setStudent('phone', v)} />
                    <Field id="s-id" label="Student ID (optional)" value={s.student.student_id} onChange={(v) => setStudent('student_id', v)} />
                    <Field id="s-year" label="Class year (optional)" value={s.student.class_year} onChange={(v) => setStudent('class_year', v)} />
                  </div>
                </fieldset>
                {!signedIn && (
                  <div className="panel">
                    <Field id="pw" label={`Create a password for ${s.booked_by === 'parent' ? 'your' : 'the'} account`} type="password" value={s.password} onChange={(v) => set('password', v)} autoComplete="new-password" hint="At least 8 characters. Already have an account? Log in first." />
                    <p className="mt-2 text-sm"><Link href={`/login?next=${encodeURIComponent(`/book?campus=${s.campus}`)}`} className="font-semibold text-pbp-700 underline">Log in instead</Link></p>
                  </div>
                )}
                <div>
                  <label htmlFor="ref" className="label">How did you hear about us?</label>
                  <select id="ref" className="input max-w-sm" value={s.referral_source} onChange={(e) => set('referral_source', e.target.value)}>
                    <option value="">Choose one (optional)</option>
                    {referralSources.map((r) => <option key={r}>{r}</option>)}
                  </select>
                </div>
                <div className="space-y-3 text-sm">
                  <Check id="terms" checked={s.terms} onChange={(v) => set('terms', v)}>I agree to the <Link href="/terms" target="_blank" className="font-semibold text-pbp-700 underline">terms</Link> and <Link href="/privacy" target="_blank" className="font-semibold text-pbp-700 underline">privacy policy</Link>.</Check>
                  <Check id="sms" checked={s.sms_consent} onChange={(v) => set('sms_consent', v)}>Text me updates about this order (drop-off reminders, items received, delivery day). Msg & data rates may apply, and message frequency varies. Reply STOP to opt out or HELP for help. Consent isn’t required to buy.</Check>
                  <Check id="mkt" checked={s.marketing_consent} onChange={(v) => set('marketing_consent', v)}>Email me occasional offers and reminders (optional).</Check>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-6">
                {s.service === 'storage' ? (
                  <>
                    <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-dashed border-stone-300 bg-sand-50 p-4">
                      <input type="checkbox" className="mt-1 h-5 w-5 accent-ink-900" checked={s.reserve_only} onChange={(e) => set('reserve_only', e.target.checked)} />
                      <span><span className="font-semibold text-ink-900">I’m not sure yet. Reserve now and I’ll add items later.</span><span className="block text-sm text-stone-600">There’s nothing to pay today, and we’ll remind you to finish before move-out.</span></span>
                    </label>
                    {!s.reserve_only && <ItemPicker catalog={data.catalog} items={s.items} setQty={(id, n) => set('items', { ...s.items, [id]: n })} />}
                  </>
                ) : (
                  <div className="panel max-w-lg space-y-5">
                    <div className="flex items-center justify-between gap-4"><span className="font-semibold">Boxes / items you’ll ship to us</span><Stepper label="Ship Ahead items" value={s.ship_ahead_count} onChange={(v) => setS((c) => ({ ...c, ship_ahead_count: v, ship_ahead_oversize: Math.min(c.ship_ahead_oversize, v) }))} /></div>
                    <div className="flex items-center justify-between gap-4"><span>Of those, over 50 lb or larger than 20×20×20 in</span><Stepper label="Oversize items" value={s.ship_ahead_oversize} onChange={(v) => set('ship_ahead_oversize', Math.min(v, s.ship_ahead_count))} /></div>
                    <p className="hint">Items must reach the warehouse by {(() => { const w = data.calendar.find((c) => c.key === 'ship_ahead_arrival'); return w ? day(w.starts_on) : 'the posted deadline' })()}.</p>
                  </div>
                )}
                {data.catalog.some((c) => c.category === 'supplies') && s.service === 'ship_ahead' && (
                  <ItemPicker catalog={data.catalog.filter((c) => c.category === 'supplies')} items={s.items} setQty={(id, n) => set('items', { ...s.items, [id]: n })} />
                )}
              </div>
            )}

            {step === 3 && (
              <div className="space-y-6">
                <div className="panel max-w-xl">
                  <p className="text-stone-700">Every order includes <strong>${data.insurance.included_cents / 100}</strong> of declared-value coverage. Add more at ${data.insurance.addon_cents_per_100 / 100} per $100{data.insurance.max_per_box_cents ? `, up to $${data.insurance.max_per_box_cents / 100} per box and $${(data.insurance.max_per_order_cents ?? 0) / 100} per order` : ''}.</p>
                  <div className="mt-5"><CoverageInput value={s.declared_value_cents} onChange={(v) => set('declared_value_cents', v)} includedCents={data.insurance.included_cents} maxCents={data.insurance.max_per_order_cents} /></div>
                  <p className="mt-3 text-sm font-semibold text-ink-900">{q.coverage.addon_cents ? `Extra coverage: ${money(q.coverage.addon_cents)}` : 'No extra charge'}</p>
                </div>
                <ul className="max-w-xl space-y-2 text-sm text-stone-600">
                  <li>• TVs and monitors must be boxed.</li>
                  <li>• Mattresses must be in an approved mattress bag.</li>
                  <li>• Report damage within {data.insurance.claim_window_days} days of delivery, and keep the box and packing.</li>
                </ul>
              </div>
            )}

            {step === 4 && (
              <div className="space-y-8">
                {s.service === 'storage' && !s.reserve_only && (
                  <fieldset>
                    <legend className="h3 mb-3">Move-out drop-off</legend>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {([['station', 'Bring it to a campus station', 'Free. Stations are outside the residence halls during move-out week.'], ['curbside', 'Curbside pickup', `Free on peak dates${peak ? ` (${shortDay(peak.starts_on)}–${shortDay(peak.ends_on ?? peak.starts_on)})` : ''}. Book 3+ days ahead.`]] as const).map(([v, t, b]) => (
                        <label key={v} className={`cursor-pointer rounded-xl border p-4 ${s.dropoff_method === v ? 'border-ink-900 bg-sand-50 ring-1 ring-ink-900' : 'border-stone-300 bg-white'}`}>
                          <input type="radio" className="sr-only" name="dropoff" checked={s.dropoff_method === v} onChange={() => setS((c) => ({ ...c, dropoff_method: v, dropoff_slot_id: '', dropoff_date: '', dropoff_window: '' }))} />
                          <span className="block font-semibold text-ink-900">{t}</span><span className="mt-1 block text-sm text-stone-600">{b}</span>
                        </label>
                      ))}
                    </div>

                    {s.dropoff_method === 'station' && (
                      <div className="mt-5 grid gap-4 sm:grid-cols-2">
                        <div>
                          <label htmlFor="station" className="label">Station</label>
                          <select id="station" className="input" value={s.dropoff_location_id} onChange={(e) => setS((c) => ({ ...c, dropoff_location_id: e.target.value, dropoff_slot_id: '', dropoff_date: '' }))}>
                            <option value="">Choose a station</option>
                            {stations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                          </select>
                        </div>
                        <div>
                          <span className="label">Day</span>
                          {!s.dropoff_location_id ? <p className="text-sm text-stone-500">Choose a station first.</p> : stationSlots.length === 0 ? <p className="text-sm text-stone-500">No open days are posted for this station yet. You can still book, and we’ll confirm your day by email.</p> : (
                            <div className="flex flex-wrap gap-2">
                              {stationSlots.map((x) => {
                                const left = x.capacity - x.booked
                                return (
                                  <button key={x.id} type="button" disabled={left <= 0} onClick={() => setS((c) => ({ ...c, dropoff_slot_id: x.id, dropoff_date: x.date, dropoff_window: x.window_label }))}
                                    className={`rounded-lg border px-3 py-2 text-left text-sm disabled:opacity-40 ${s.dropoff_slot_id === x.id ? 'border-ink-900 bg-ink-900 text-white' : 'border-stone-300 bg-white'}`}>
                                    <span className="block font-semibold">{shortDay(x.date)}</span><span className="block text-xs opacity-80">{x.window_label}{left <= 0 ? ' · full' : left < 15 ? ` · ${left} left` : ''}</span>
                                  </button>
                                )
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {s.dropoff_method === 'curbside' && (
                      <div className="mt-5 grid gap-4 sm:grid-cols-2">
                        <div>
                          <label htmlFor="cdate" className="label">Pickup date</label>
                          {curbDates.length > 0 ? (
                            <select id="cdate" className="input" value={s.dropoff_date} onChange={(e) => setS((c) => ({ ...c, dropoff_date: e.target.value, dropoff_slot_id: '', dropoff_window: '' }))}>
                              <option value="">Choose a date</option>
                              {curbDates.map((d) => <option key={d} value={d}>{shortDay(d)}{peak && inWindow(d, peak.starts_on, peak.ends_on) ? ' · free' : ''}</option>)}
                            </select>
                          ) : (
                            <input id="cdate" type="date" className="input" min={minCurbside} value={s.dropoff_date} onChange={(e) => set('dropoff_date', e.target.value)} />
                          )}
                        </div>
                        <div>
                          <label htmlFor="cwin" className="label">Time window</label>
                          <select id="cwin" className="input" value={s.dropoff_slot_id || s.dropoff_window} onChange={(e) => {
                            const slot = curbSlots.find((x) => x.id === e.target.value)
                            setS((c) => ({ ...c, dropoff_slot_id: slot?.id ?? '', dropoff_window: slot?.window_label ?? e.target.value }))
                          }}>
                            <option value="">Choose a window</option>
                            {curbSlots.filter((x) => x.date === s.dropoff_date).length > 0
                              ? curbSlots.filter((x) => x.date === s.dropoff_date).map((x) => <option key={x.id} value={x.id} disabled={x.booked >= x.capacity}>{x.window_label}{x.booked >= x.capacity ? ' (full)' : ''}</option>)
                              : ['9am – 12pm', '12pm – 3pm', '3pm – 6pm'].map((w) => <option key={w} value={w}>{w}</option>)}
                          </select>
                        </div>
                        <div className="sm:col-span-2">
                          <Field id="caddr" label="Pickup address" value={s.dropoff_address} onChange={(v) => set('dropoff_address', v)} autoComplete="street-address" hint={`Curbside, within about ${data.campus.service_radius_miles} mile of campus.`} />
                        </div>
                      </div>
                    )}
                  </fieldset>
                )}

                <fieldset>
                  <legend className="h3 mb-3">{s.service === 'storage' ? 'Fall return' : 'Delivery when you arrive'}</legend>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {([
                      ['on_campus', 'On campus', 'Pick up at a Move-In Station near your hall. Free during peak move-in.'],
                      ['off_campus', 'Off-campus address', `Delivered 9am–5pm${(() => { const f = data.fees.find((x) => x.code === 'offcampus_delivery'); return f ? `, ${money(f.amount_cents)}` : '' })()}.`],
                      ...(s.service === 'storage' ? [['ship', 'Ship it to me', 'Not coming back? Billed at the actual shipping cost.'], ['extended', 'Keep it stored', 'Studying abroad or need longer storage.']] as const : []),
                    ] as const).map(([v, t, b]) => (
                      <label key={v} className={`cursor-pointer rounded-xl border p-4 ${s.return_method === v ? 'border-ink-900 bg-sand-50 ring-1 ring-ink-900' : 'border-stone-300 bg-white'}`}>
                        <input type="radio" className="sr-only" name="return" checked={s.return_method === v} onChange={() => set('return_method', v as WizardState['return_method'])} />
                        <span className="block font-semibold text-ink-900">{t}</span><span className="mt-1 block text-sm text-stone-600">{b}</span>
                      </label>
                    ))}
                  </div>
                  {s.return_method === 'on_campus' && <div className="mt-4 max-w-md"><Field id="hall" label="Fall residence hall" value={s.return_hall} onChange={(v) => set('return_hall', v)} hint="Don’t have your housing assignment yet? Leave this blank and add it later in your account." /></div>}
                  {(s.return_method === 'off_campus' || s.return_method === 'ship') && <div className="mt-4 max-w-xl"><Field id="raddr" label={s.return_method === 'ship' ? 'Ship to address' : 'Fall address'} value={s.return_address} onChange={(v) => set('return_address', v)} hint={s.return_method === 'off_campus' ? 'Not sure yet? Leave this blank and add it before the deadline.' : undefined} /></div>}
                  {s.service === 'storage' && (
                    <div className="mt-4"><Check id="early" checked={s.early_withdrawal} onChange={(v) => set('early_withdrawal', v)}>I’ll need my things back early, before {(() => { const w = data.calendar.find((c) => c.key === 'early_withdrawal_before'); return w ? day(w.starts_on, { month: 'long', day: 'numeric' }) : 'July 1' })()}.</Check></div>
                  )}
                </fieldset>

                <fieldset>
                  <legend className="h3 mb-1">Someone else dropping off or picking up?</legend>
                  <p className="mb-3 text-sm text-stone-600">Optional. We’ll release items to this person.</p>
                  <div className="grid max-w-xl gap-4 sm:grid-cols-2">
                    <Field id="proxy-name" label="Name" value={s.proxy_name} onChange={(v) => set('proxy_name', v)} />
                    <Field id="proxy-phone" label="Phone" type="tel" value={s.proxy_phone} onChange={(v) => set('proxy_phone', v)} />
                  </div>
                </fieldset>

                <div className="max-w-xl">
                  <label htmlFor="notes" className="label">Notes for our team (optional)</label>
                  <textarea id="notes" rows={3} className="input" value={s.notes} onChange={(e) => set('notes', e.target.value)} placeholder="Items not on the list, access details, anything else" />
                </div>
              </div>
            )}

            {step === 5 && (
              <div className="space-y-6">
                <dl className="grid gap-4 sm:grid-cols-2">
                  <Summary t="School & service" v={`${data.campus.name} · ${s.service === 'storage' ? 'Summer storage' : 'Ship Ahead'}`} onEdit={() => setStep(0)} />
                  <Summary t="Student" v={`${s.student.first_name} ${s.student.last_name} · ${s.student.email}`} onEdit={() => setStep(1)} />
                  <Summary t="Items" v={s.reserve_only ? 'Reserved, items to be added later' : `${q.item_count} item${q.item_count === 1 ? '' : 's'}`} onEdit={() => setStep(2)} />
                  <Summary t="Coverage" v={`$${(q.coverage.declared_cents / 100).toLocaleString()} declared value`} onEdit={() => setStep(3)} />
                  {s.service === 'storage' && !s.reserve_only && <Summary t="Drop-off" v={s.dropoff_method === 'station' ? `${stations.find((l) => l.id === s.dropoff_location_id)?.name ?? 'Station'} · ${s.dropoff_date ? shortDay(s.dropoff_date) : 'day TBD'}` : `Curbside · ${s.dropoff_date ? shortDay(s.dropoff_date) : ''} ${s.dropoff_window}`} onEdit={() => setStep(4)} />}
                  <Summary t="Return" v={{ on_campus: `On campus${s.return_hall ? ` · ${s.return_hall}` : ' · hall TBD'}`, off_campus: `Off campus${s.return_address ? ` · ${s.return_address}` : ' · address TBD'}`, ship: `Ship to ${s.return_address}`, extended: 'Extended storage', undecided: 'Decide later' }[s.return_method]} onEdit={() => setStep(4)} />
                </dl>

                <div className="panel max-w-xl">
                  <label htmlFor="promo" className="label">Promo code</label>
                  <div className="flex gap-2">
                    <input id="promo" className="input" value={s.promo_code} onChange={(e) => set('promo_code', e.target.value.toUpperCase())} />
                    <button type="button" className="btn-outline" onClick={applyPromo}>Apply</button>
                  </div>
                  {promoMsg && <p className="hint" role="status">{promoMsg}</p>}
                </div>

                <div className="panel max-w-xl">
                  <PayMethodToggle method={s.pay_method} setMethod={(m) => set('pay_method', m)} actualCents={q.due_now_cents} />
                </div>

                <p className="max-w-xl text-sm text-stone-600">
                  We’ll save your payment method with Stripe. If our crew logs different or extra items at drop-off, or fees apply (overweight boxes, unthawed fridges, delivery, shipping, extended storage, late payment), the difference is charged to it and itemized in your account.
                </p>

                {!backendReady && (
                  <p className="max-w-xl rounded-xl border border-gold-500/40 bg-gold-100 px-4 py-3 text-sm text-ink-900">Online booking isn’t connected yet on this preview site. Your cart is saved in this browser.</p>
                )}
                {submitError && <p role="alert" className="max-w-xl rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{submitError}</p>}

                <button type="button" className="btn-primary w-full max-w-xl text-base" disabled={submitting || !backendReady} onClick={submit}>
                  {submitting ? 'Working…' : s.reserve_only || pay.total_cents === 0 ? 'Reserve my spot' : `Pay ${money(pay.total_cents)} by ${s.pay_method === 'ach' ? 'bank transfer' : 'card'}`}
                </button>
              </div>
            )}
          </div>

          {step < 5 && (
            <div className="mt-10 flex max-w-xl gap-3">
              {step > 0 && <button type="button" className="btn-outline" onClick={back}>Back</button>}
              <button type="button" className="btn-dark flex-1 sm:flex-none sm:px-10" onClick={next}>Continue</button>
            </div>
          )}
          {step === 5 && <button type="button" className="btn-outline mt-4" onClick={back}>Back</button>}
        </div>

        <aside className="hidden lg:sticky lg:top-24 lg:block lg:self-start">
          <CartSummary quote={q} method={s.pay_method} title={`${data.campus.short_name} ${s.service === 'storage' ? 'storage' : 'Ship Ahead'}`} />
          <p className="mt-3 text-center text-xs text-stone-500">Your progress is saved on this device.</p>
        </aside>
      </div>

      {/* Sticky mobile cart */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-stone-200 bg-white/95 px-4 py-3 backdrop-blur lg:hidden">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs text-stone-500">{q.item_count} items · {s.pay_method === 'ach' ? 'bank' : 'card'}</p>
            <p className="text-lg font-extrabold text-ink-900">{money(pay.total_cents)}</p>
          </div>
          {step < 5 ? <button type="button" className="btn-dark" onClick={next}>Continue</button> : <span className="text-sm font-semibold text-stone-600">Review above</span>}
        </div>
      </div>
    </div>
  )
}

function Field({ id, label, value, onChange, type = 'text', hint, autoComplete, disabled }: { id: string; label: string; value: string; onChange: (v: string) => void; type?: string; hint?: string; autoComplete?: string; disabled?: boolean }) {
  return (
    <div>
      <label htmlFor={id} className="label">{label}</label>
      <input id={id} type={type} className="input disabled:bg-stone-100" value={value} onChange={(e) => onChange(e.target.value)} autoComplete={autoComplete} disabled={disabled} aria-describedby={hint ? `${id}-hint` : undefined} />
      {hint && <p id={`${id}-hint`} className="hint">{hint}</p>}
    </div>
  )
}

function Check({ id, checked, onChange, children }: { id: string; checked: boolean; onChange: (v: boolean) => void; children: React.ReactNode }) {
  return (
    <label htmlFor={id} className="flex cursor-pointer items-start gap-3">
      <input id={id} type="checkbox" className="mt-0.5 h-5 w-5 shrink-0 accent-ink-900" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="text-stone-700">{children}</span>
    </label>
  )
}

function Summary({ t, v, onEdit }: { t: string; v: string; onEdit: () => void }) {
  return (
    <div className="rounded-xl border border-stone-200 bg-white p-4">
      <dt className="flex items-center justify-between text-sm text-stone-500">{t}<button type="button" onClick={onEdit} className="font-semibold text-pbp-700 underline">Edit</button></dt>
      <dd className="mt-1 font-semibold text-ink-900">{v}</dd>
    </div>
  )
}
