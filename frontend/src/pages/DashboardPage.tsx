import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { BarList, MonthlyChart, type BarItem, type MonthPoint } from '@/components/Charts'
import { Icon } from '@/components/Icon'
import { PageHeader } from '@/components/PageHeader'
import { DuplicateBadge, StatusBadge } from '@/components/StatusBadge'
import { downloadFile } from '@/lib/api'
import { formatDate, formatRM } from '@/lib/format'
import type { Receipt } from '@/lib/types'
import { useApi } from '@/lib/useApi'

type Dashboard = {
  totalIn: number
  totalOut: number
  approvedCount: number
  pendingCount: number
  pendingCents: number
  purposeBars: BarItem[]
  payerBars: BarItem[]
  months: MonthPoint[]
  recent: Receipt[]
}

const PERIODS = [
  { value: 'this-month', label: 'This month' },
  { value: 'last-month', label: 'Last month' },
  { value: 'this-year', label: 'This year' },
  { value: 'all', label: 'All time' },
]

const tileClass =
  'card flex flex-col items-center gap-2 px-2 py-3 text-center text-xs font-semibold text-slate-700 hover:border-brand-600'

export function DashboardPage() {
  const [params, setParams] = useSearchParams()
  const period = params.get('period') ?? 'this-month'
  const { data, error } = useApi<Dashboard>(`/api/admin/dashboard?${params.toString()}`)
  const [from, setFrom] = useState(params.get('from') ?? '')
  const [to, setTo] = useState(params.get('to') ?? '')
  const [exportError, setExportError] = useState('')

  if (error) return <p className="text-sm text-red-700">{error}</p>
  if (!data) return <p className="text-sm text-slate-500">Loading…</p>

  const balance = data.totalIn - data.totalOut
  const periodLabel = PERIODS.find((p) => p.value === period)?.label ?? 'Custom range'
  const overview = [
    { label: 'Total money in', value: formatRM(data.totalIn), tone: 'text-green-700' },
    { label: 'Total money out', value: formatRM(data.totalOut), tone: 'text-slate-900' },
    { label: 'Approved receipts', value: String(data.approvedCount), tone: 'text-slate-900' },
    { label: 'Pending approval', value: String(data.pendingCount), tone: 'text-brand-700' },
  ]

  const exportAll = (format: 'xlsx' | 'pdf') => {
    setExportError('')
    downloadFile(`/api/admin/export?format=${format}`, `receipts.${format}`).catch((e: Error) => setExportError(e.message))
  }

  return (
    <div>
      <PageHeader title="Dashboard" crumbs={[{ label: 'Dashboard' }]} />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="min-w-0 space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="card text-center">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Money in</p>
              <p className="mt-2 text-2xl font-extrabold tabular-nums text-green-700">{formatRM(data.totalIn)}</p>
            </div>
            <div className="card text-center">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Money out</p>
              <p className="mt-2 text-2xl font-extrabold tabular-nums text-slate-900">{formatRM(data.totalOut)}</p>
            </div>
            <div className="card text-center">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Balance</p>
              <p className="mt-2 text-2xl font-extrabold tabular-nums text-purple-700">{formatRM(balance)}</p>
            </div>
          </div>

          <div className="card">
            <div className="tabs mb-4">
              {PERIODS.map((p) => (
                <Link key={p.value} to={`/admin?period=${p.value}`} className={`tab ${period === p.value ? 'tab-active' : ''}`}>
                  {p.label}
                </Link>
              ))}
              {period === 'custom' && <span className="tab tab-active">Custom range</span>}
            </div>
            <div className="grid gap-6 md:grid-cols-2">
              <section>
                <h2 className="card-title">Spending by purpose</h2>
                <BarList items={data.purposeBars} empty="No approved spending in this period." />
              </section>
              <section>
                <h2 className="card-title">Spending by who paid</h2>
                <BarList items={data.payerBars} empty="No approved spending in this period." />
              </section>
            </div>
          </div>

          <section className="card">
            <h2 className="card-title">Month by month, last 12 months</h2>
            <MonthlyChart months={data.months} />
          </section>

          <section className="card p-0">
            <div className="flex items-center justify-between px-4 pt-4">
              <h2 className="card-title">Recent receipts</h2>
              <Link to="/admin/receipts" className="link tap mb-1 text-xs md:mb-3">
                View all
              </Link>
            </div>
            <ul className="divide-y divide-slate-100 md:hidden">
              {data.recent.map((r) => (
                <li key={r.id}>
                  <Link to={`/admin/receipts/${r.id}`} className="flex items-center gap-3 px-4 py-3 active:bg-slate-50">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-slate-900">
                        {r.purposeName}
                        {r.counterparty && <span className="font-normal text-slate-500"> · {r.counterparty}</span>}
                      </p>
                      <p className="text-xs text-slate-500">
                        {formatDate(r.receiptDate)} · {r.submittedBy}
                      </p>
                      <div className="mt-1 flex flex-wrap gap-1">
                        <StatusBadge status={r.status} />
                        {r.possibleDuplicate && <DuplicateBadge />}
                      </div>
                    </div>
                    <p className="shrink-0 font-semibold tabular-nums">
                      {r.direction === 'IN' ? '+' : '-'} {formatRM(r.amountCents)}
                    </p>
                  </Link>
                </li>
              ))}
              {data.recent.length === 0 && <li className="px-4 py-3 text-slate-500">No receipts yet.</li>}
            </ul>
            <div className="hidden overflow-x-auto md:block">
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
                  {data.recent.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50">
                      <td className="td whitespace-nowrap">
                        <Link to={`/admin/receipts/${r.id}`} className="link">
                          {formatDate(r.receiptDate)}
                        </Link>
                      </td>
                      <td className="td font-semibold">{r.purposeName}</td>
                      <td className="td">{r.counterparty || '—'}</td>
                      <td className="td">{r.submittedBy}</td>
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
                  {data.recent.length === 0 && (
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
              {data.pendingCount > 0 && <> {formatRM(data.pendingCents)} is still pending.</>}
            </p>
          </div>

          <form
            className="card space-y-3"
            onSubmit={(e) => {
              e.preventDefault()
              setParams({ period: 'custom', ...(from && { from }), ...(to && { to }) })
            }}
          >
            <h2 className="card-title">Custom period</h2>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label" htmlFor="from">
                  From
                </label>
                <input className="input" id="from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
              </div>
              <div>
                <label className="label" htmlFor="to">
                  To
                </label>
                <input className="input" id="to" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
              </div>
            </div>
            <button className="btn w-full">Apply period</button>
          </form>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-2">
            <Link to="/capture" className={tileClass}>
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
                <Icon name="camera" className="h-5 w-5" />
              </span>
              Snap Receipt
            </Link>
            <Link to="/admin/receipts?status=PENDING" className={tileClass}>
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50 text-amber-700">
                <Icon name="check" className="h-5 w-5" />
              </span>
              Review Pending
            </Link>
            <button type="button" onClick={() => exportAll('xlsx')} className={tileClass}>
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-50 text-green-700">
                <Icon name="excel" className="h-5 w-5" />
              </span>
              Export Excel
            </button>
            <button type="button" onClick={() => exportAll('pdf')} className={tileClass}>
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-50 text-purple-700">
                <Icon name="pdf" className="h-5 w-5" />
              </span>
              Export PDF
            </button>
          </div>
          {exportError && <p className="text-sm text-red-700">{exportError}</p>}
        </aside>
      </div>
    </div>
  )
}
