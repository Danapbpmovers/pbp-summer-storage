import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import SiteFooter from '@/components/SiteFooter'
import SiteHeader from '@/components/SiteHeader'
import HomeView, { type Look } from '@/components/home/HomeView'

export const metadata: Metadata = { robots: { index: false } }

const looks: Record<Look, string> = { a: 'A · Campus Classic', b: 'B · Bold Move-Out', c: 'C · Fresh & Light' }

export function generateStaticParams() {
  return Object.keys(looks).map((look) => ({ look }))
}

// Design review only: compare the three homepage directions side by side.
export default async function Preview({ params }: { params: Promise<{ look: string }> }) {
  const { look } = await params
  if (!(look in looks)) notFound()
  return (
    <div data-look={look}>
      <div className="no-print flex flex-wrap items-center justify-center gap-2 bg-pbp-700 px-4 py-2 text-sm text-white">
        <span className="font-semibold">Design preview:</span>
        {Object.entries(looks).map(([k, v]) => (
          <Link key={k} href={`/preview/${k}`} className={`rounded-full px-3 py-0.5 ${k === look ? 'bg-white font-bold text-pbp-700' : 'hover:bg-white/15'}`}>{v}</Link>
        ))}
      </div>
      <SiteHeader />
      <main id="main"><HomeView look={look as Look} /></main>
      <SiteFooter />
    </div>
  )
}
