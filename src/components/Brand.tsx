import Link from 'next/link'
import { brand } from '@/config/site'

/** Original box mark + text wordmark. Approved logo files can replace this markup later. */
export function Mark({ className = 'h-9 w-9', inverted = false }: { className?: string; inverted?: boolean }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <rect width="32" height="32" rx="8" fill={inverted ? '#f5b100' : '#2e1a12'} />
      <path d="M8 12l8-4 8 4v9l-8 4-8-4zM8 12l8 4 8-4M16 16v9" fill="none" stroke={inverted ? '#2e1a12' : '#f5b100'} strokeWidth="2.2" strokeLinejoin="round" />
    </svg>
  )
}

export function Wordmark({ inverted = false }: { inverted?: boolean }) {
  return (
    <Link href="/" className="flex items-center gap-2.5" aria-label={`${brand.name} home`}>
      <Mark inverted={inverted} />
      <span className="leading-tight">
        <span className={`block text-[17px] font-extrabold tracking-tight ${inverted ? 'text-white' : 'text-ink-900'}`}>
          {brand.ups ? brand.ups.name : brand.name}
          {brand.ups && <span className={`ml-1 text-[13px] font-bold ${inverted ? 'text-white/60' : 'text-ink-600'}`}>{brand.ups.store}</span>}
        </span>
        <span className={`block text-[12px] font-semibold ${inverted ? 'text-gold-400' : 'text-ink-700'}`}>
          {brand.programName}
          <span className={inverted ? 'text-white/55' : 'text-pbp-700'}> · with {brand.partner}</span>
        </span>
      </span>
    </Link>
  )
}
