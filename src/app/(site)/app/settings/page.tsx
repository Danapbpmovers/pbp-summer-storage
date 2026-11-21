import { getSession, serverClient } from '@/lib/supabase/server'
import { InviteForm } from '@/components/portal'
import { RemoveCollaborator } from '@/components/RemoveCollaborator'

export default async function Settings() {
  const [sb, session] = await Promise.all([serverClient(), getSession()])
  const p = session!.profile
  const { data: collabs } = await sb!.from('collaborators').select('*').eq('owner_id', session!.userId).order('invited_at')
  return (
    <>
      <h1 className="h2">Settings</h1>
      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section className="panel">
          <h2 className="h3">Profile</h2>
          <dl className="mt-3 space-y-1 text-stone-700">
            <div><dt className="inline font-semibold">Name: </dt><dd className="inline">{p?.first_name} {p?.last_name}</dd></div>
            <div><dt className="inline font-semibold">Email: </dt><dd className="inline">{session!.email}</dd></div>
            <div><dt className="inline font-semibold">Phone: </dt><dd className="inline">{p?.phone || '—'}</dd></div>
            <div><dt className="inline font-semibold">Text updates: </dt><dd className="inline">{p?.sms_consent ? 'On' : 'Off'}</dd></div>
          </dl>
          <p className="hint mt-3">To change these details, email support@packstoreship.com.</p>
        </section>
        <section className="panel">
          <h2 className="h3">Share your account</h2>
          <p className="mt-1 mb-4 text-sm text-stone-600">Invite a parent or student. They’ll see your orders, items and photos, and can pay or schedule if you allow it.</p>
          <InviteForm />
          {!!collabs?.length && (
            <ul className="mt-5 divide-y divide-stone-100 border-t border-stone-100">
              {collabs.map((c) => (
                <li key={c.id} className="flex items-center justify-between py-2 text-sm">
                  <span>{c.email}<span className="block text-xs text-stone-500">{[c.can_pay && 'pay', c.can_schedule && 'schedule'].filter(Boolean).join(', ') || 'view only'}{c.accepted_at ? '' : ' · invited'}</span></span>
                  <RemoveCollaborator id={c.id} />
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  )
}
