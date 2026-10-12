import Link from 'next/link'
import { BarList, MonthlyChart, type MonthPoint } from '@/components/Charts'
import { Icon } from '@/components/Icon'
import { PageHeader } from '@/components/PageHeader'
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

  const balance = totalIn - totalOut
  const periodLabel = PERIODS.find((p) => p.value === period)?.label ?? 'Custom range'
  const overview = [
    { label: 'Total money in', value: formatRM(totalIn), tone: 'text-green-700' },
    { label: 'Total money out', value: formatRM(totalOut), tone: 'text-slate-900' },
    { label: 'Approved receipts', value: String(approvedCount), tone: 'text-slate-900' },
    { label: 'Pending approval', value: String(pending._count), tone: 'text-brand-700' },
  ]
  const quickActions = [
    { href: '/capture', label: 'Snap Receipt', icon: 'camera', tone: 'bg-brand-50 text-brand-700' },
    { href: '/admin/receipts?status=PENDING', label: 'Review Pending', icon: 'check', tone: 'bg-amber-50 text-amber-700' },
    { href: '/api/admin/export?format=xlsx', label: 'Export Excel', icon: 'excel', tone: 'bg-green-50 text-green-700' },
    { href: '/api/admin/export?format=pdf', label: 'Export PDF', icon: 'pdf', tone: 'bg-purple-50 text-purple-700' },
  ]

  return (
    <div>
      <PageHeader title="Dashboard" crumbs={[{ label: 'Dashboard' }]} />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="min-w-0 space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="card">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Money in</p>
              <p className="mt-2 text-2xl font-extrabold tabular-nums text-green-700">{formatRM(totalIn)}</p>
            </div>
            <div className="card">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Money out</p>
              <p className="mt-2 text-2xl font-extrabold tabular-nums text-slate-900">{formatRM(totalOut)}</p>
            </div>
            <div className="card text-center">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-700">Balance</p>
              <p className="mt-2 text-2xl font-extrabold tabular-nums text-purple-700">{formatRM(balance)}</p>
            </div>
          </div>

          <div className="card">
            <div className="tabs mb-4">
              {PERIODS.map((p) => (
                <Link
                  key={p.value}
                  href={`/admin?period=${p.value}`}
                  className={`tab ${period === p.value ? 'tab-active' : ''}`}
                >
                  {p.label}
                </Link>
              ))}
              {period === 'custom' && <span className="tab tab-active">Custom range</span>}
            </div>
            <div className="grid gap-6 md:grid-cols-2">
              <section>
                <h2 className="card-title">Spending by purpose</h2>
                <BarList items={purposeBars} empty="No approved spending in this period." />
              </section>
              <section>
                <h2 className="card-title">Spending by who paid</h2>
                <BarList items={payerBars} empty="No approved spending in this period." />
              </section>
            </div>
          </div>

          <section className="card">
            <h2 className="card-title">Month by month, last 12 months</h2>
            <MonthlyChart months={months} />
          </section>

          <section className="card p-0">
            <div className="flex items-center justify-between px-4 pt-4">
              <h2 className="card-title">Recent receipts</h2>
              <Link href="/admin/receipts" className="link mb-3 text-xs">
                View all
              </Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px]">
                <thead>
                  <tr>
                    <th className="th">Date</th>
                    <th className="th">Purpose</th>
                    <th className="th">Paid to / from</th>
                    <th className="th">Submitted by</th>
                    <th className="th">Status</th>
                    <th className="th text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recent.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50">
                      <td className="td whitespace-nowrap">
                        <Link href={`/admin/receipts/${r.id}`} className="link">
                          {formatDate(r.receiptDate)}
                        </Link>
                      </td>
                      <td className="td font-semibold">{r.purpose.name}</td>
                      <td className="td">{r.counterparty || '—'}</td>
                      <td className="td">{r.submittedBy.name}</td>
                      <td className="td">
                        <div className="flex flex-wrap gap-1">
                          <StatusBadge status={r.status} />
                          {r.possibleDuplicate && <DuplicateBadge />}
                        </div>
                      </td>
                      <td className="td whitespace-nowrap text-right font-semibold tabular-nums">
                        {r.direction === 'IN' ? '+' : '-'} {formatRM(r.amountCents)}
                      </td>
                    </tr>
                  ))}
                  {recent.length === 0 && (
                    <tr>
                      <td className="td text-slate-500" colSpan={6}>
                        No receipts yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        <aside className="space-y-4">
          <div className="panel">
            <h2 className="panel-head">Overview · {periodLabel}</h2>
            <dl className="panel-body space-y-2.5">
              {overview.map((row) => (
                <div key={row.label} className="flex justify-between gap-3">
                  <dt className="font-semibold text-slate-700">{row.label}</dt>
                  <dd className={`font-semibold tabular-nums ${row.tone}`}>{row.value}</dd>
                </div>
              ))}
              <div className="flex justify-between gap-3 border-t border-slate-200 pt-3">
                <dt className="font-extrabold text-slate-900">Balance</dt>
                <dd className="text-base font-extrabold tabular-nums text-purple-700">{formatRM(balance)}</dd>
              </div>
            </dl>
            <p className="px-4 pb-4 text-xs text-slate-500">
              Only approved receipts count.
              {pending._count > 0 && <> {formatRM(pending._sum.amountCents ?? 0)} is still pending.</>}
            </p>
          </div>

          <form method="get" className="card space-y-3">
            <h2 className="card-title">Custom period</h2>
            <input type="hidden" name="period" value="custom" />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label" htmlFor="from">
                  From
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
                <input
                  className="input"
                  id="to"
                  name="to"
                  type="date"
                  defaultValue={period === 'custom' ? searchParams.to : ''}
                />
              </div>
            </div>
            <button className="btn w-full">Apply period</button>
          </form>

          <div className="grid grid-cols-4 gap-2 xl:grid-cols-2">
            {quickActions.map((action) => (
              <a
                key={action.label}
                href={action.href}
                className="card flex flex-col items-center gap-2 px-2 py-3 text-center text-xs font-semibold text-slate-700 hover:border-brand-600"
              >
                <span className={`flex h-10 w-10 items-center justify-center rounded-lg ${action.tone}`}>
                  <Icon name={action.icon} className="h-5 w-5" />
                </span>
                {action.label}
              </a>
            ))}
          </div>
        </aside>
      </div>
    </div>
  )
}
