'use client'
export function RemoveCollaborator({ id }: { id: string }) {
  return (
    <button type="button" className="text-sm font-semibold text-red-700 underline" onClick={async () => {
      if (!confirm('Remove access?')) return
      await fetch(`/api/collaborators?id=${id}`, { method: 'DELETE' })
      window.location.reload()
    }}>Remove</button>
  )
}
