import QRCode from 'qrcode'
import { notFound } from 'next/navigation'
import { serverClient } from '@/lib/supabase/server'
import { PrintButton } from '@/components/PrintButton'

// Printable labels: one per item, 2 × 4 per letter page (fits Avery 5163-style sheets or plain paper).
export default async function Labels({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const sb = await serverClient()
  const { data: o } = await sb!.from('orders').select('order_number, student_first_name, student_last_name, student_phone, campuses(short_name)').eq('id', id).maybeSingle()
  if (!o) notFound()
  const { data: items } = await sb!.from('order_items').select('id, name, label_code').eq('order_id', id).order('created_at')
  const qrs = await Promise.all((items ?? []).map((it) => QRCode.toString(it.label_code, { type: 'svg', margin: 0, errorCorrectionLevel: 'M' })))
  const campus = (o.campuses as unknown as { short_name: string } | null)?.short_name

  return (
    <>
      <div className="no-print mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="h2">Labels for order #{o.order_number}</h1>
          <p className="mt-1 text-stone-600">Print and tape one label to each item, on top and clearly visible. You can reprint anytime.</p>
        </div>
        <PrintButton />
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 print:grid-cols-2 print:gap-0">
        {(items ?? []).map((it, i) => (
          <div key={it.id} className="flex h-[2.4in] break-inside-avoid items-center gap-4 rounded-xl border-2 border-dashed border-stone-300 p-4 print:rounded-none print:border-stone-400">
            <div className="h-28 w-28 shrink-0 [&_svg]:h-full [&_svg]:w-full" dangerouslySetInnerHTML={{ __html: qrs[i] }} />
            <div className="min-w-0">
              <p className="font-mono text-xl font-bold tracking-wider text-ink-900">{it.label_code}</p>
              <p className="mt-1 text-lg font-bold">{o.student_first_name} {o.student_last_name}</p>
              <p className="text-sm">{o.student_phone}</p>
              <p className="mt-1 truncate text-sm text-stone-600">{it.name}</p>
              <p className="text-xs text-stone-500">Order #{o.order_number} · {campus} · {i + 1} of {items!.length}</p>
            </div>
          </div>
        ))}
      </div>
    </>
  )
}
