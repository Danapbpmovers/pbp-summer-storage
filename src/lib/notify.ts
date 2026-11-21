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

/** Sends only if the customer opted in. Quiet hours: 9pm–8am ET messages are logged for staff to resend. */
export async function sendSms(db: SupabaseClient, m: Msg & { consent: boolean }) {
  if (!m.consent || !m.to) return
  const hour = Number(new Date().toLocaleString('en-US', { timeZone: 'America/New_York', hour: 'numeric', hour12: false }))
  const quiet = hour >= 21 || hour < 8
  const sid = process.env.TWILIO_ACCOUNT_SID, token = process.env.TWILIO_AUTH_TOKEN, from = process.env.TWILIO_FROM_NUMBER
  let status: 'sent' | 'failed' | 'logged_only' | 'queued' = quiet ? 'queued' : 'logged_only'
  let providerId: string | null = null
  const body = `${m.body} Reply STOP to opt out.`
  if (sid && token && from && !quiet) {
    try {
      const r = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
        method: 'POST',
        headers: { authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString('base64')}`, 'content-type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ To: m.to, From: from, Body: body }),
      })
      const j = await r.json().catch(() => ({}))
      status = r.ok ? 'sent' : 'failed'
      providerId = j.sid ?? null
    } catch { status = 'failed' }
  }
  await db.from('message_log').insert({ customer_id: m.customerId, order_id: m.orderId, channel: 'sms', template: m.template, recipient: m.to, body, status, provider_id: providerId })
}
