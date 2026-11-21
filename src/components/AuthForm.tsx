'use client'
import Link from 'next/link'
import { useState } from 'react'
import { browserClient } from '@/lib/supabase/browser'

export function LoginForm({ next }: { next: string }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const sb = browserClient()
  return (
    <form className="space-y-4" onSubmit={async (e) => {
      e.preventDefault()
      if (!sb) { setError('Accounts aren’t connected yet on this preview site.'); return }
      setBusy(true); setError('')
      const { error } = await sb.auth.signInWithPassword({ email, password })
      if (error) { setError(error.message === 'Invalid login credentials' ? 'That email and password don’t match.' : error.message); setBusy(false); return }
      window.location.href = next.startsWith('/') ? next : '/app'
    }}>
      <div><label htmlFor="email" className="label">Email</label><input id="email" type="email" required autoComplete="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
      <div><label htmlFor="password" className="label">Password</label><input id="password" type="password" required autoComplete="current-password" className="input" value={password} onChange={(e) => setPassword(e.target.value)} /></div>
      {error && <p role="alert" className="text-sm font-semibold text-red-700">{error}</p>}
      <button className="btn-dark w-full" disabled={busy}>{busy ? 'Logging in…' : 'Log in'}</button>
      <p className="text-center text-sm"><Link href="/forgot-password" className="font-semibold text-pbp-700 underline">Forgot password?</Link></p>
    </form>
  )
}

export function ForgotForm() {
  const [email, setEmail] = useState('')
  const [done, setDone] = useState(false)
  const sb = browserClient()
  if (done) return <p role="status" className="text-stone-700">If an account exists for {email}, we’ve emailed a reset link.</p>
  return (
    <form className="space-y-4" onSubmit={async (e) => {
      e.preventDefault()
      await sb?.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/auth/callback?next=/reset-password` })
      setDone(true)
    }}>
      <div><label htmlFor="email" className="label">Email</label><input id="email" type="email" required className="input" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
      <button className="btn-dark w-full">Send reset link</button>
    </form>
  )
}

export function ResetForm() {
  const [pw, setPw] = useState('')
  const [msg, setMsg] = useState('')
  const sb = browserClient()
  return (
    <form className="space-y-4" onSubmit={async (e) => {
      e.preventDefault()
      if (pw.length < 8) { setMsg('Use at least 8 characters.'); return }
      const { error } = (await sb?.auth.updateUser({ password: pw })) ?? { error: null }
      if (error) setMsg(error.message); else window.location.href = '/app'
    }}>
      <div><label htmlFor="pw" className="label">New password</label><input id="pw" type="password" autoComplete="new-password" className="input" value={pw} onChange={(e) => setPw(e.target.value)} /></div>
      {msg && <p role="alert" className="text-sm font-semibold text-red-700">{msg}</p>}
      <button className="btn-dark w-full">Save password</button>
    </form>
  )
}

export function SignupForm() {
  const [f, setF] = useState({ first_name: '', last_name: '', email: '', phone: '', password: '' })
  const [terms, setTerms] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)
  const sb = browserClient()
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value })
  if (sent) return <p role="status" className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-green-900">Check your email ({f.email}) and click the confirmation link, then log in.</p>
  return (
    <form className="space-y-4" onSubmit={async (e) => {
      e.preventDefault(); setError('')
      if (!sb) { setError('Accounts aren’t connected yet on this preview site.'); return }
      if (f.password.length < 8) { setError('Use a password with at least 8 characters.'); return }
      if (!terms) { setError('Please accept the terms.'); return }
      setBusy(true)
      const { data, error } = await sb.auth.signUp({
        email: f.email.trim().toLowerCase(), password: f.password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?next=/app`,
          data: { first_name: f.first_name.trim(), last_name: f.last_name.trim(), phone: f.phone.trim(), terms_accepted: true },
        },
      })
      setBusy(false)
      if (error) { setError(error.message); return }
      if (data.user && data.user.identities?.length === 0) { setError('An account with this email already exists. Log in instead.'); return }
      if (data.session) { window.location.href = '/app'; return }
      setSent(true)
    }}>
      <div className="grid grid-cols-2 gap-3">
        <div><label htmlFor="su-first" className="label">First name</label><input id="su-first" required autoComplete="given-name" className="input" value={f.first_name} onChange={set('first_name')} /></div>
        <div><label htmlFor="su-last" className="label">Last name</label><input id="su-last" required autoComplete="family-name" className="input" value={f.last_name} onChange={set('last_name')} /></div>
      </div>
      <div><label htmlFor="su-email" className="label">Email</label><input id="su-email" type="email" required autoComplete="email" className="input" value={f.email} onChange={set('email')} /></div>
      <div><label htmlFor="su-phone" className="label">Mobile phone</label><input id="su-phone" type="tel" autoComplete="tel" className="input" value={f.phone} onChange={set('phone')} /></div>
      <div><label htmlFor="su-pw" className="label">Password</label><input id="su-pw" type="password" required autoComplete="new-password" className="input" value={f.password} onChange={set('password')} /><p className="hint">At least 8 characters.</p></div>
      <label className="flex items-start gap-3 text-sm text-stone-700"><input type="checkbox" className="mt-0.5 h-5 w-5 accent-ink-900" checked={terms} onChange={(e) => setTerms(e.target.checked)} /><span>I agree to the <Link href="/terms" target="_blank" className="font-semibold text-pbp-700 underline">terms</Link> and <Link href="/privacy" target="_blank" className="font-semibold text-pbp-700 underline">privacy policy</Link>.</span></label>
      {error && <p role="alert" className="text-sm font-semibold text-red-700">{error}</p>}
      <button className="btn-dark w-full" disabled={busy}>{busy ? 'Creating…' : 'Create account'}</button>
    </form>
  )
}
