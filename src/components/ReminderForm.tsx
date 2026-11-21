'use client'
import { useState } from 'react'

export default function ReminderForm({ campusSlug }: { campusSlug?: string }) {
  const [email, setEmail] = useState('')
  const [consent, setConsent] = useState(false)
  const [state, setState] = useState<'idle' | 'sending' | 'done' | 'error'>('idle')
  const [msg, setMsg] = useState('')

  return (
    <form
      className="w-full max-w-lg"
      onSubmit={async (e) => {
        e.preventDefault()
        if (!consent) { setState('error'); setMsg('Please tick the box so we can email you.'); return }
        setState('sending')
        const r = await fetch('/api/reminders', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email, campus: campusSlug }) })
        const j = await r.json().catch(() => ({}))
        if (r.ok) { setState('done'); setMsg('You’re on the list. We’ll email you before move-out and move-in.') }
        else { setState('error'); setMsg(j.error ?? 'Something went wrong. Please try again.') }
      }}
    >
      {state === 'done' ? (
        <p role="status" className="rounded-xl bg-white/10 px-4 py-3 font-semibold text-white">{msg}</p>
      ) : (
        <>
          <div className="flex flex-col gap-2 sm:flex-row">
            <label htmlFor="reminder-email" className="sr-only">Email address</label>
            <input id="reminder-email" type="email" required autoComplete="email" placeholder="you@school.edu" className="input" value={email} onChange={(e) => setEmail(e.target.value)} />
            <button className="btn-primary shrink-0" disabled={state === 'sending'}>{state === 'sending' ? 'Saving…' : 'Remind me'}</button>
          </div>
          <label className="mt-3 flex items-start gap-2 text-sm text-white/75">
            <input type="checkbox" className="mt-1 h-4 w-4 accent-gold-500" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
            <span>Email me move-out and move-in reminders. No marketing, unsubscribe anytime.</span>
          </label>
          {state === 'error' && <p role="alert" className="mt-2 text-sm font-semibold text-gold-400">{msg}</p>}
        </>
      )}
    </form>
  )
}
