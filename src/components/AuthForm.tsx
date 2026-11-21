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
