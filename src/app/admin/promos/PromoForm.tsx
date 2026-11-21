'use client'
import { useActionState } from 'react'
import { createPromo } from '../actions'

export default function PromoForm({ campuses }: { campuses: { id: string; name: string }[] }) {
  const [state, action, pending] = useActionState(createPromo, null)
  return (
    <form action={action} className="panel h-fit space-y-3">
      <h2 className="h3">New code</h2>
      <div><label htmlFor="code" className="label">Code</label><input id="code" name="code" required placeholder="BU2027" className="input uppercase" /></div>
      <div className="grid grid-cols-2 gap-2">
        <div><label htmlFor="type" className="label">Type</label><select id="type" name="type" className="input"><option value="percent">% off</option><option value="amount">$ off</option></select></div>
        <div><label htmlFor="value" className="label">Amount</label><input id="value" name="value" required inputMode="decimal" placeholder="10" className="input" /></div>
      </div>
      <div><label htmlFor="campus" className="label">School</label><select id="campus" name="campus_id" className="input"><option value="">All schools</option>{campuses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
      <div className="grid grid-cols-2 gap-2">
        <div><label htmlFor="exp" className="label">Expires (optional)</label><input id="exp" name="expires_on" type="date" className="input" /></div>
        <div><label htmlFor="max" className="label">Max uses (optional)</label><input id="max" name="max_uses" inputMode="numeric" className="input" /></div>
      </div>
      {state?.error && <p role="alert" className="text-sm font-semibold text-red-700">{state.error}</p>}
      {state?.ok && <p role="status" className="text-sm font-semibold text-ok">{state.ok}</p>}
      <button className="btn-dark" disabled={pending}>{pending ? 'Saving…' : 'Create code'}</button>
    </form>
  )
}
