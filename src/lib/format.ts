export const money = (cents: number) =>
  (cents / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' })

const parse = (iso: string) => new Date(`${iso.slice(0, 10)}T12:00:00`)

export const day = (iso: string, opts: Intl.DateTimeFormatOptions = { month: 'long', day: 'numeric', year: 'numeric' }) =>
  parse(iso).toLocaleDateString('en-US', opts)

export const shortDay = (iso: string) => day(iso, { weekday: 'short', month: 'short', day: 'numeric' })

export const range = (start: string, end?: string | null) => {
  if (!end || end === start) return day(start)
  const s = parse(start), e = parse(end)
  if (s.getFullYear() === e.getFullYear() && s.getMonth() === e.getMonth())
    return `${day(start, { month: 'long', day: 'numeric' })} – ${e.getDate()}, ${e.getFullYear()}`
  return `${day(start, { month: 'long', day: 'numeric' })} – ${day(end)}`
}

export const todayIso = (tz = 'America/New_York') => new Date().toLocaleDateString('en-CA', { timeZone: tz })

export const addDays = (iso: string, n: number) => {
  const d = parse(iso)
  d.setDate(d.getDate() + n)
  return d.toLocaleDateString('en-CA')
}

export const inWindow = (iso: string, start: string, end?: string | null) => iso >= start && iso <= (end ?? start)
