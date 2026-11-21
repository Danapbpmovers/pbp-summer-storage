import { serverClient } from '@/lib/supabase/server'
import { shortDay } from '@/lib/format'
import { saveDate, saveSlot } from '../actions'

export default async function AdminCalendar({ searchParams }: { searchParams: Promise<{ campus?: string }> }) {
  const sb = (await serverClient())!
  const { data: campuses } = await sb.from('campuses').select('id, slug, name').order('sort')
  const { campus: slug } = await searchParams
  const campus = campuses?.find((c) => c.slug === slug) ?? campuses?.[0]
  if (!campus) return <p>No campuses yet.</p>
  const [{ data: dates }, { data: slots }] = await Promise.all([
    sb.from('calendar_windows').select('*').eq('campus_id', campus.id).order('starts_on'),
    sb.from('slots').select('*, locations(name)').eq('campus_id', campus.id).order('date').order('kind'),
  ])
  return (
    <>
      <h1 className="h2">Dates & capacity · {campus.name}</h1>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="panel h-fit">
          <h2 className="h3">Key dates</h2>
          {(dates ?? []).map((d) => (
            <form key={d.id} action={saveDate} className="grid grid-cols-[1fr_auto] items-end gap-2 border-b border-stone-100 py-3">
              <input type="hidden" name="id" value={d.id} />
              <p className="col-span-2 text-sm font-semibold text-ink-900">{d.label} {!d.confirmed && <span className="badge bg-gold-100 text-ink-800">needs confirmation</span>}</p>
              <div className="flex flex-wrap items-center gap-2">
                <input type="date" name="starts_on" defaultValue={d.starts_on} className="input min-h-9 w-auto py-1" aria-label="Start" />
                <span className="text-stone-400">to</span>
                <input type="date" name="ends_on" defaultValue={d.ends_on ?? ''} className="input min-h-9 w-auto py-1" aria-label="End (optional)" />
                <label className="flex items-center gap-1 text-xs"><input type="checkbox" name="confirmed" defaultChecked={d.confirmed} className="accent-ink-900" />Confirmed</label>
              </div>
              <button className="btn-outline btn-sm">Save</button>
            </form>
          ))}
        </section>
        <section className="panel">
          <h2 className="h3">Capacity</h2>
          <p className="hint">Bookings stop once a slot is full.</p>
          <table className="tbl mt-3">
            <thead><tr><th>Date</th><th>Where</th><th>Booked</th><th>Capacity</th></tr></thead>
            <tbody>
              {(slots ?? []).map((s) => (
                <tr key={s.id}>
                  <td className="whitespace-nowrap">{shortDay(s.date)}</td>
                  <td>{(s.locations as { name: string } | null)?.name ?? 'Curbside'}<span className="block text-xs text-stone-500">{s.window_label}</span></td>
                  <td className={s.booked >= s.capacity ? 'font-bold text-red-700' : ''}>{s.booked}</td>
                  <td>
                    <form action={saveSlot} className="flex gap-1">
                      <input type="hidden" name="id" value={s.id} /><input type="hidden" name="window_label" value={s.window_label} />
                      <input name="capacity" defaultValue={s.capacity} inputMode="numeric" className="input min-h-9 w-16 px-2 py-1" aria-label="Capacity" />
                      <button className="btn-outline btn-sm">Save</button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
    </>
  )
}
