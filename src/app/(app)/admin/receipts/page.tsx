import Link from 'next/link'
import { reviewReceipt } from '@/app/actions'
import { DuplicateBadge, StatusBadge } from '@/components/StatusBadge'
import { requireAdmin } from '@/lib/auth'
import { db } from '@/lib/db'
import { filtersToQuery, readFilters, receiptWhere } from '@/lib/filters'
import { directionLabel, formatDate, formatRM } from '@/lib/format'

export const dynamic = 'force-dynamic'

const PAGE_SIZE = 50

type Props = { searchParams: Record<string, string | string[] | undefined> }

export default async function ReceiptsPage({ searchParams }: Props) {
  await requireAdmin()
  const filters = readFilters(searchParams)
  const where = receiptWhere(filters)
  const page = Math.max(1, Number(searchParams.page) || 1)

  const [receipts, count, sums, purposes] = await Promise.all([
    db.receipt.findMany({
      where,
      include: { purpose: true, payer: true, submittedBy: { select: { name: true } } },
      orderBy: [{ receiptDate: 'desc' }, { id: 'desc' }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    db.receipt.count({ where }),
    db.receipt.groupBy({ by: ['direction'], where, _sum: { amountCents: true } }),
    db.purpose.findMany({ orderBy: { id: 'asc' } }),
  ])

  const query = filtersToQuery(filters)
  const totalIn = sums.find((s) => s.direction === 'IN')?._sum.amountCents ?? 0
  const totalOut = sums.find((s) => s.direction === 'OUT')?._sum.amountCents ?? 0
  const pages = Math.max(1, Math.ceil(count / PAGE_SIZE))
  const pageLink = (n: number) => `/admin/receipts?${query}${query ? '&' : ''}page=${n}`

  // Buy / Sale tabs keep the other filters and drop the page number
  const tab = (direction: string) => {
    const qs = filtersToQuery({ ...filters, direction: direction || undefined })
    return `/admin/receipts${qs ? `?${qs}` : ''}`
  }
  const tabs = [
    { value: '', label: 'All' },
    { value: 'OUT', label: 'Buy' },
    { value: 'IN', label: 'Sale' },
  ]

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">Receipts documented</h1>
        <div className="flex gap-2">
          <a className="btn-secondary" href={`/api/admin/export?format=xlsx&${query}`}>
            Export Excel
          </a>
          <a className="btn-secondary" href={`/api/admin/export?format=pdf&${query}`}>
            Export PDF
          </a>
        </div>
      </div>

      <div className="inline-flex rounded-lg border border-slate-300 bg-white p-0.5 text-sm">
        {tabs.map((t) => (
          <Link
            key={t.value}
            href={tab(t.value)}
            className={`rounded-md px-4 py-1.5 ${
              (filters.direction ?? '') === t.value ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-100'
            }`}
          >
            {t.label}
          </Link>
        ))}
      </div>

      <form className="card grid grid-cols-2 gap-3 md:grid-cols-6" method="get">
        {filters.direction && <input type="hidden" name="direction" value={filters.direction} />}
        <div>
          <label className="label" htmlFor="status">
            Status
          </label>
          <select className="input" id="status" name="status" defaultValue={filters.status ?? ''}>
            <option value="">All</option>
            <option value="PENDING">Pending</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </div>
        <div>
          <label className="label" htmlFor="purposeId">
            Purpose
          </label>
          <select className="input" id="purposeId" name="purposeId" defaultValue={filters.purposeId ?? ''}>
            <option value="">All</option>
            {purposes.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="from">
            From
          </label>
          <input className="input" id="from" name="from" type="date" defaultValue={filters.from ?? ''} />
        </div>
        <div>
          <label className="label" htmlFor="to">
            To
          </label>
          <input className="input" id="to" name="to" type="date" defaultValue={filters.to ?? ''} />
        </div>
        <div>
          <label className="label" htmlFor="q">
            Search
          </label>
          <input className="input" id="q" name="q" placeholder="Vendor or note" defaultValue={filters.q ?? ''} />
        </div>
        <div className="flex items-end gap-2">
          <button className="btn flex-1">Apply</button>
          <Link className="btn-secondary" href="/admin/receipts">
            Clear
          </Link>
        </div>
      </form>

      <p className="text-sm text-slate-600">
        {count} receipt{count === 1 ? '' : 's'} · Money in {formatRM(totalIn)} · Money out {formatRM(totalOut)}
      </p>

      <div className="card overflow-x-auto p-0">
        <table className="w-full min-w-[720px]">
          <thead className="border-b border-slate-200">
            <tr>
              <th className="th">Date</th>
              <th className="th">Type</th>
              <th className="th">Purpose</th>
              <th className="th">Paid to / from</th>
              <th className="th">Paid by</th>
              <th className="th text-right">Amount</th>
              <th className="th">Status</th>
              <th className="th"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {receipts.map((r) => (
              <tr key={r.id}>
                <td className="td whitespace-nowrap">{formatDate(r.receiptDate)}</td>
                <td className="td">{directionLabel(r.direction)}</td>
                <td className="td">{r.purpose.name}</td>
                <td className="td">{r.counterparty || '—'}</td>
                <td className="td">{r.payer?.name ?? '—'}</td>
                <td className="td whitespace-nowrap text-right tabular-nums">{formatRM(r.amountCents)}</td>
                <td className="td">
                  <div className="flex flex-wrap gap-1">
                    <StatusBadge status={r.status} />
                    {r.possibleDuplicate && <DuplicateBadge />}
                  </div>
                </td>
                <td className="td">
                  <div className="flex items-center justify-end gap-3 whitespace-nowrap">
                    {r.status === 'PENDING' && (
                      <form action={reviewReceipt}>
                        <input type="hidden" name="id" value={r.id} />
                        <button name="status" value="APPROVED" className="text-sm font-medium text-green-700 underline">
                          Approve
                        </button>
                      </form>
                    )}
                    <Link href={`/admin/receipts/${r.id}`} className="text-sm underline">
                      Open
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
            {receipts.length === 0 && (
              <tr>
                <td className="td text-slate-500" colSpan={8}>
                  No receipts match these filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {pages > 1 && (
        <div className="flex items-center justify-between text-sm">
          {page > 1 ? (
            <Link className="underline" href={pageLink(page - 1)}>
              Previous
            </Link>
          ) : (
            <span />
          )}
          <span className="text-slate-500">
            Page {page} of {pages}
          </span>
          {page < pages ? (
            <Link className="underline" href={pageLink(page + 1)}>
              Next
            </Link>
          ) : (
            <span />
          )}
        </div>
      )}
    </div>
  )
}
