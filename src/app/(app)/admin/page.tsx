import Link from 'next/link'
import { BarList, MonthlyChart, type MonthPoint } from '@/components/Charts'
import { DuplicateBadge, StatusBadge } from '@/components/StatusBadge'
import { requireAdmin } from '@/lib/auth'
import { db } from '@/lib/db'
import { formatDate, formatRM, parseDateInput, toDateInput } from '@/lib/format'

export const dynamic = 'force-dynamic'

const PERIODS = [
  { value: 'this-month', label: 'This month' },
  { value: 'last-month', label: 'Last month' },
  { value: 'this-year', label: 'This year' },
  { value: 'all', label: 'All time' },
]

// Receipt dates are stored as UTC midnight, so "now" is shifted to Malaysia time (UTC+8)
// before picking month boundaries.
function malaysiaToday() {
  return new Date(Date.now() + 8 * 3_600_000)
}

function periodRange(period: string, from?: string, to?: string): { gte?: Date; lte?: Date } {
  const now = malaysiaToday()
  const y = now.getUTCFullYear()
  const m = now.getUTCMonth()
  if (period === 'custom') {
    const gte = from ? parseDateInput(from) : null
    const lte = to ? parseDateInput(to) : null
    return { ...(gte && { gte }), ...(lte && { lte }) }
  }
  if (period === 'last-month') return { gte: new Date(Date.UTC(y, m - 1, 1)), lte: new Date(Date.UTC(y, m, 0)) }
  if (period === 'this-year') return { gte: new Date(Date.UTC(y, 0, 1)), lte: new Date(Date.UTC(y, 11, 31)) }
  if (period === 'all') return {}
  return { gte: new Date(Date.UTC(y, m, 1)), lte: new Date(Date.UTC(y, m + 1, 0)) }
}

type Props = { searchParams: { period?: string; from?: string; to?: string } }

export default async function DashboardPage({ searchParams }: Props) {
  await requireAdmin()
  const period = searchParams.period ?? 'this-month'
  const range = periodRange(period, searchParams.from, searchParams.to)
  const approved = { status: 'APPROVED', ...(Object.keys(range).length && { receiptDate: range }) }

  const now = malaysiaToday()
  const chartStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 11, 1))

  const [sums, byPurpose, byPayer, purposes, payers, pending, monthly, recent] = await Promise.all([
    db.receipt.groupBy({ by: ['direction'], where: approved, _sum: { amountCents: true }, _count: true }),
    db.receipt.groupBy({ by: ['purposeId'], where: { ...approved, direction: 'OUT' }, _sum: { amountCents: true } }),
    db.receipt.groupBy({ by: ['payerId'], where: { ...approved, direction: 'OUT' }, _sum: { amountCents: true } }),
    db.purpose.findMany(),
    db.payer.findMany(),
    db.receipt.aggregate({ where: { status: 'PENDING' }, _count: true, _sum: { amountCents: true } }),
    db.receipt.findMany({
      where: { status: 'APPROVED', receiptDate: { gte: chartStart } },
      select: { receiptDate: true, direction: true, amountCents: true },
    }),
    db.receipt.findMany({
      include: { purpose: true, submittedBy: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
      take: 8,
    }),
  ])

  const totalIn = sums.find((s) => s.direction === 'IN')?._sum.amountCents ?? 0
  const totalOut = sums.find((s) => s.direction === 'OUT')?._sum.amountCents ?? 0
  const approvedCount = sums.reduce((sum, s) => sum + s._count, 0)

  const purposeBars = byPurpose
    .map((row) => ({
      label: purposes.find((p) => p.id === row.purposeId)?.name ?? 'Unknown',
      cents: row._sum.amountCents ?? 0,
    }))
    .sort((a, b) => b.cents - a.cents)
  const payerBars = byPayer
    .map((row) => ({
      label: payers.find((p) => p.id === row.payerId)?.name ?? 'Not recorded',
      cents: row._sum.amountCents ?? 0,
    }))
    .sort((a, b) => b.cents - a.cents)

  const months: MonthPoint[] = Array.from({ length: 12 }, (_, i) => {
    const date = new Date(Date.UTC(chartStart.getUTCFullYear(), chartStart.getUTCMonth() + i, 1))
    return {
      key: toDateInput(date).slice(0, 7),
      label: date.toLocaleDateString('en-MY', { month: 'short', year: 'numeric', timeZone: 'UTC' }),
      inCents: 0,
      outCents: 0,
    }
  })
  for (const r of monthly) {
    const month = months.find((m) => m.key === toDateInput(r.receiptDate).slice(0, 7))
    if (!month) continue
    if (r.direction === 'IN') month.inCents += r.amountCents
    else month.outCents += r.amountCents
  }

  const tiles = [
    { label: 'Money in', value: formatRM(totalIn) },
    { label: 'Money out', value: formatRM(totalOut) },
    { label: 'Balance', value: formatRM(totalIn - totalOut) },
  ]

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">Dashboard</h1>
        <div className="inline-flex flex-wrap rounded-lg border border-slate-300 bg-white p-0.5 text-sm">
          {PERIODS.map((p) => (
            <Link
              key={p.value}
              href={`/admin?period=${p.value}`}
              className={`rounded-md px-3 py-1.5 ${
                period === p.value ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              {p.label}
            </Link>
          ))}
        </div>
      </div>

      <form method="get" className="flex flex-wrap items-end gap-2 text-sm">
        <input type="hidden" name="period" value="custom" />
        <div>
          <label className="label" htmlFor="from">
            Custom from
          </label>
          <input
            className="input"
            id="from"
            name="from"
            type="date"
            defaultValue={period === 'custom' ? searchParams.from : ''}
          />
        </div>
        <div>
          <label className="label" htmlFor="to">
            To
          </label>
          <input className="input" id="to" name="to" type="date" defaultValue={period === 'custom' ? searchParams.to : ''} />
        </div>
        <button className="btn-secondary">Apply</button>
      </form>

      <div className="grid gap-3 sm:grid-cols-3">
        {tiles.map((tile) => (
          <div key={tile.label} className="card">
            <p className="text-sm text-slate-500">{tile.label}</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">{tile.value}</p>
          </div>
        ))}
      </div>
      <p className="text-sm text-slate-600">
        Totals count the {approvedCount} approved receipt{approvedCount === 1 ? '' : 's'} in this period.{' '}
        {pending._count > 0 && (
          <Link href="/admin/receipts?status=PENDING" className="font-medium underline">
            {pending._count} pending ({formatRM(pending._sum.amountCents ?? 0)}) waiting for approval
          </Link>
        )}
      </p>

      <div className="grid gap-4 md:grid-cols-2">
        <section className="card">
          <h2 className="mb-3 font-medium">Spending by purpose</h2>
          <BarList items={purposeBars} empty="No approved spending in this period." />
        </section>
        <section className="card">
          <h2 className="mb-3 font-medium">Spending by who paid</h2>
          <BarList items={payerBars} empty="No approved spending in this period." />
        </section>
      </div>

      <section className="card">
        <h2 className="mb-3 font-medium">Month by month, last 12 months</h2>
        <MonthlyChart months={months} />
      </section>

      <section className="card">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-medium">Recent receipts</h2>
          <Link href="/admin/receipts" className="text-sm underline">
            View all
          </Link>
        </div>
        {recent.length === 0 ? (
          <p className="text-sm text-slate-500">No receipts yet.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {recent.map((r) => (
              <li key={r.id}>
                <Link href={`/admin/receipts/${r.id}`} className="flex items-center gap-3 py-2 hover:bg-slate-50">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm">
                      {r.purpose.name}
                      {r.counterparty && <span className="text-slate-500"> · {r.counterparty}</span>}
                    </p>
                    <p className="text-xs text-slate-500">
                      {formatDate(r.receiptDate)} · {r.submittedBy.name}
                    </p>
                  </div>
                  <div className="flex flex-wrap justify-end gap-1">
                    {r.possibleDuplicate && <DuplicateBadge />}
                    <StatusBadge status={r.status} />
                  </div>
                  <p className="w-28 shrink-0 text-right text-sm font-medium tabular-nums">
                    {r.direction === 'IN' ? '+' : '-'} {formatRM(r.amountCents)}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
