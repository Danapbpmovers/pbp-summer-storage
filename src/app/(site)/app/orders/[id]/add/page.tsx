import Link from 'next/link'
import { notFound } from 'next/navigation'
import { orderAccess } from '@/lib/access'
import { getCampusData } from '@/lib/campus'
import { ADDABLE_STATUSES } from '@/lib/orders'
import { serverClient } from '@/lib/supabase/server'
import AddItemsForm from './AddItemsForm'

export default async function AddItems({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const access = await orderAccess(id)
  if (!access) notFound()
  const sb = (await serverClient())!
  const { data: o } = await sb.from('orders').select('id, order_number, service, status, student_first_name, campuses(slug, name)').eq('id', id).single()
  const campus = o!.campuses as unknown as { slug: string; name: string }
  const data = await getCampusData(campus.slug)
  const back = <Link href={`/app/orders/${id}`} className="text-sm font-semibold text-pbp-700">← Back to order #{o!.order_number}</Link>

  if (!ADDABLE_STATUSES.includes(o!.status) || !access.canPay || !data) {
    return (
      <>
        {back}
        <h1 className="h2 mt-3">Items can’t be added to this order</h1>
        <p className="mt-3 text-stone-600">{!access.canPay ? 'Only someone who can pay for this order can add items.' : 'This order is already on its way back. Start a new booking, or contact us and we’ll help.'}</p>
      </>
    )
  }
  return (
    <>
      {back}
      <h1 className="h2 mt-3">Add items to order #{o!.order_number}</h1>
      <p className="mt-2 max-w-2xl text-stone-600">Pick what you’re adding and pay for just those items. Each new item gets its own label to print, and everything stays on the same order.</p>
      <div className="mt-8">
        <AddItemsForm orderId={id} service={o!.service} data={{ ...data, catalog: o!.service === 'storage' ? data.catalog : data.catalog.filter((c) => c.category === 'supplies') }} />
      </div>
    </>
  )
}
