import { Link, useSearchParams } from 'react-router-dom'
import { AuthImage } from '@/components/AuthImage'
import { Icon } from '@/components/Icon'
import { PageHeader } from '@/components/PageHeader'
import { DuplicateBadge, StatusBadge } from '@/components/StatusBadge'
import { formatDate, formatRM } from '@/lib/format'
import type { Receipt } from '@/lib/types'
import { useApi } from '@/lib/useApi'

export function MyReceiptsPage() {
  const [params] = useSearchParams()
  const { data, error, loading } = useApi<{ receipts: Receipt[] }>('/api/receipts')
  const receipts = data?.receipts ?? []

  return (
    <div className="space-y-4">
      <PageHeader title="My Receipts" crumbs={[{ label: 'My Receipts' }]}>
        <Link to="/capture" className="btn">
          <Icon name="camera" />
          Snap a receipt
        </Link>
      </PageHeader>

      {params.get('saved') && (
        <p className="rounded-lg bg-green-100 px-3 py-2 text-sm text-green-800">
          Receipt saved. It is waiting for admin approval.
        </p>
      )}
      {error && <p className="text-sm text-red-700">{error}</p>}

      {loading && !data ? (
        <p className="card text-sm text-slate-500">Loading…</p>
      ) : receipts.length === 0 ? (
        <p className="card text-sm text-slate-600">You have not submitted any receipts yet.</p>
      ) : (
        <ul className="space-y-2">
          {receipts.map((r) => (
            <li key={r.id} className="card flex items-center gap-3">
              <AuthImage receiptId={r.id} className="h-14 w-14 shrink-0 rounded-lg border border-slate-200 object-cover" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">
                  {r.purposeName}
                  {r.counterparty && <span className="font-normal text-slate-500"> · {r.counterparty}</span>}
                </p>
                <p className="text-xs text-slate-500">{formatDate(r.receiptDate)}</p>
                <div className="mt-1 flex flex-wrap gap-1">
                  <StatusBadge status={r.status} />
                  {r.possibleDuplicate && <DuplicateBadge />}
                </div>
              </div>
              <p className="shrink-0 text-sm font-extrabold tabular-nums">
                {r.direction === 'IN' ? '+' : '-'} {formatRM(r.amountCents)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
