import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import { contact } from '@/config/site'

// Transactional email (Resend) and SMS (Twilio). With no keys set, messages are
// written to message_log with status 'logged_only' so nothing is lost.

interface Msg {
  customerId?: string | null
  orderId?: string | null
  template: string
  to: string
  subject?: string
  body: string
}

export async function sendEmail(db: SupabaseClient, m: Msg) {
  let status: 'sent' | 'failed' | 'logged_only' = 'logged_only'
  let providerId: string | null = null
  const key = process.env.RESEND_API_KEY
  if (key) {
    try {
      const r = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' },
        body: JSON.stringify({ from: process.env.EMAIL_FROM ?? `PackStoreShip <${contact.email}>`, to: m.to, subject: m.subject, text: m.body, reply_to: contact.email }),
      })
      const j = await r.json().catch(() => ({}))
      status = r.ok ? 'sent' : 'failed'
      providerId = j.id ?? null
    } catch { status = 'failed' }
  }
  await db.from('message_log').insert({ customer_id: m.customerId, order_id: m.orderId, channel: 'email', template: m.template, recipient: m.to, subject: m.subject, body: m.body, status, provider_id: providerId })
}

/** US numbers typed any way ("617-555-0142", "6175550142") to E.164 ("+16175550142"). */
export function toE164(raw: string | null | undefined): string | null {
  if (!raw) return null
  const t = raw.trim()
  if (t.startsWith('+')) return /^\+\d{8,15}$/.test(t.replace(/[^\d+]/g, '')) ? t.replace(/[^\d+]/g, '') : null
  const d = t.replace(/\D/g, '')
  if (d.length === 10) return `+1${d}`
  if (d.length === 11 && d.startsWith('1')) return `+${d}`
  return null
}

const TZ = 'America/New_York'

/** Next 8:05am Eastern as an ISO timestamp (UTC). */
function nextMorningEastern(now = new Date()) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hour12: false })
    .formatToParts(now).map((p) => [p.type, p.value]))
  const hour = Number(parts.hour) % 24
  const day = new Date(Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day) + (hour >= 8 ? 1 : 0), 8, 5))
  // Shift by the Eastern offset on that date (handles daylight saving).
  const asEastern = new Date(day.toLocaleString('en-US', { timeZone: TZ }))
  const asUtc = new Date(day.toLocaleString('en-US', { timeZone: 'UTC' }))
  return new Date(day.getTime() + (asUtc.getTime() - asEastern.getTime())).toISOString()
}

/**
 * Text message through Twilio, only to customers who opted in.
 * Credentials: TWILIO_ACCOUNT_SID plus a site-only API key (TWILIO_API_KEY_SID + TWILIO_API_KEY_SECRET);
 * TWILIO_AUTH_TOKEN also works but gives access to the whole Twilio account.
 * Sender: TWILIO_MESSAGING_SERVICE_SID (recommended: keeps texts on your registered A2P campaign and
 * lets texts written 9pm–8am Eastern be scheduled for 8:05am) or TWILIO_FROM_NUMBER.
 * Without credentials, the text is written to message_log only.
 */
export async function sendSms(db: SupabaseClient, m: Msg & { consent: boolean }) {
  const to = toE164(m.to)
  if (!m.consent || !to) return
  const env = process.env
  const account = env.TWILIO_ACCOUNT_SID
  const user = env.TWILIO_API_KEY_SID || account
  const secret = env.TWILIO_API_KEY_SECRET || env.TWILIO_AUTH_TOKEN
  const service = env.TWILIO_MESSAGING_SERVICE_SID
  const from = env.TWILIO_FROM_NUMBER
  const hour = Number(new Intl.DateTimeFormat('en-US', { timeZone: TZ, hour: '2-digit', hour12: false }).format(new Date())) % 24
  const quiet = hour >= 21 || hour < 8
  const body = `${m.body} Reply STOP to opt out.`

  let status: 'sent' | 'failed' | 'logged_only' | 'queued' = 'logged_only'
  let providerId: string | null = null
  if (account && user && secret && (service || from)) {
    if (quiet && !service) {
      status = 'queued' // quiet hours and no Messaging Service to schedule with: staff can resend from the log
    } else {
      const form = new URLSearchParams({ To: to, Body: body })
      if (service) form.set('MessagingServiceSid', service)
      else form.set('From', from!)
      if (quiet && service) { form.set('ScheduleType', 'fixed'); form.set('SendAt', nextMorningEastern()) }
      try {
        const r = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${account}/Messages.json`, {
          method: 'POST',
          headers: { authorization: `Basic ${Buffer.from(`${user}:${secret}`).toString('base64')}`, 'content-type': 'application/x-www-form-urlencoded' },
          body: form,
        })
        const j = await r.json().catch(() => ({}))
        status = r.ok ? (quiet ? 'queued' : 'sent') : 'failed'
        providerId = j.sid ?? (r.ok ? null : `error ${j.code ?? r.status}`)
      } catch { status = 'failed' }
    }
  }
  await db.from('message_log').insert({ customer_id: m.customerId, order_id: m.orderId, channel: 'sms', template: m.template, recipient: to, body, status, provider_id: providerId })
}

/** Texts the order owner if they opted in. */
export async function smsOrderOwner(db: SupabaseClient, orderId: string, template: string, text: string) {
  const { data: o } = await db.from('orders').select('customer_id, profiles(phone, sms_consent)').eq('id', orderId).single()
  const p = o?.profiles as unknown as { phone: string; sms_consent: boolean } | null
  if (o && p) await sendSms(db, { customerId: o.customer_id, orderId, template, to: p.phone, consent: p.sms_consent, body: text })
}
