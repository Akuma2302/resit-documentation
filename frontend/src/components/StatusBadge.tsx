import { statusLabel } from '@/lib/format'

const styles: Record<string, string> = {
  PENDING: 'bg-amber-100 text-amber-800',
  APPROVED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-red-100 text-red-800',
}

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${styles[status] ?? ''}`}>
      {statusLabel[status] ?? status}
    </span>
  )
}

export function DuplicateBadge() {
  return (
    <span className="inline-block rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-800">
      Possible duplicate
    </span>
  )
}
