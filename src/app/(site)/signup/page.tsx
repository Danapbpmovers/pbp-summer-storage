import { redirect } from 'next/navigation'

// Accounts are created as the first part of booking, so signup goes to the wizard.
export default async function Signup({ searchParams }: { searchParams: Promise<{ campus?: string; as?: string }> }) {
  const sp = await searchParams
  redirect(`/book?${new URLSearchParams(Object.entries(sp).filter(([, v]) => v) as [string, string][]).toString()}`)
}
