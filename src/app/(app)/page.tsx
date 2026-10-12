import Link from 'next/link'
import { DuplicateBadge, StatusBadge } from '@/components/StatusBadge'
import { requireUser } from '@/lib/auth'
import { db } from '@/lib/db'
import { formatDate, formatRM } from '@/lib/format'

export const dynamic = 'force-dynamic'

export default async function MyReceiptsPage({ searchParams }: { searchParams: { saved?: string } }) {
  const session = await requireUser()
  const receipts = await db.receipt.findMany({
    where: { submittedById: session.userId },
    include: { purpose: true },
    orderBy: { createdAt: 'desc' },
    take: 100,
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">My receipts</h1>
        <Link href="/capture" className="btn">
          Snap a receipt
        </Link>
      </div>

      {searchParams.saved && (
        <p className="rounded-lg bg-green-100 px-3 py-2 text-sm text-green-800">
          Receipt saved. It is waiting for admin approval.
        </p>
      )}

      {receipts.length === 0 ? (
        <p className="card text-sm text-slate-600">You have not submitted any receipts yet.</p>
      ) : (
        <ul className="space-y-2">
          {receipts.map((r) => (
            <li key={r.id} className="card flex items-center gap-3">
              <a href={`/api/receipts/${r.id}/image`} target="_blank" className="shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/api/receipts/${r.id}/image`}
                  alt="Receipt"
                  loading="lazy"
                  className="h-14 w-14 rounded-lg border border-slate-200 object-cover"
                />
              </a>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {r.purpose.name}
                  {r.counterparty && <span className="font-normal text-slate-500"> · {r.counterparty}</span>}
                </p>
                <p className="text-xs text-slate-500">{formatDate(r.receiptDate)}</p>
                <div className="mt-1 flex flex-wrap gap-1">
                  <StatusBadge status={r.status} />
                  {r.possibleDuplicate && <DuplicateBadge />}
                </div>
              </div>
              <p className="shrink-0 text-sm font-semibold tabular-nums">
                {r.direction === 'IN' ? '+' : '-'} {formatRM(r.amountCents)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
