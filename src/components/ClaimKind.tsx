/** Damaged / Missing badge for claims. */
export function ClaimKind({ kind }: { kind: string }) {
  const missing = kind === 'missing'
  return (
    <span className={`badge ${missing ? 'bg-pbp-50 text-pbp-700' : 'bg-red-50 text-red-800'}`}>{missing ? 'Missing' : 'Damaged'}</span>
  )
}
