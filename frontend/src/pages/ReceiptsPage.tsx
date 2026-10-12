import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Icon } from '@/components/Icon'
import { PageHeader } from '@/components/PageHeader'
import { DuplicateBadge, StatusBadge } from '@/components/StatusBadge'
import { api, downloadFile } from '@/lib/api'
import { directionLabel, formatDate, formatRM } from '@/lib/format'
import type { PurposeOption, Receipt } from '@/lib/types'
import { useApi } from '@/lib/useApi'

type ReceiptList = {
  receipts: Receipt[]
  count: number
  page: number
  pages: number
  totalIn: number
  totalOut: number
  purposes: PurposeOption[]
}

const TABS = [
  { value: '', label: 'All' },
  { value: 'OUT', label: 'Buy' },
  { value: 'IN', label: 'Sale' },
]

const FILTER_KEYS = ['status', 'purposeId', 'from', 'to', 'q'] as const
type FormFilters = Record<(typeof FILTER_KEYS)[number], string>

const readForm = (params: URLSearchParams) =>
  Object.fromEntries(FILTER_KEYS.map((key) => [key, params.get(key) ?? ''])) as FormFilters

export function ReceiptsPage() {
  const [params, setParams] = useSearchParams()
  const { data, error, reload } = useApi<ReceiptList>(`/api/admin/receipts?${params.toString()}`)
  const [form, setForm] = useState<FormFilters>(() => readForm(params))
  const [actionError, setActionError] = useState('')

  // keep the form in step when the URL changes (tabs, links from the dashboard, back button)
  useEffect(() => setForm(readForm(params)), [params])

  const direction = params.get('direction') ?? ''

  // Every filter change drops the page number so the list restarts at page 1
  const withParams = (changes: Record<string, string>) => {
    const next = new URLSearchParams(params)
    next.delete('page')
    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(key, value)
      else next.delete(key)
    }
    return next
  }
  const pageLink = (page: number) => {
    const next = new URLSearchParams(params)
    next.set('page', String(page))
    return `/admin/receipts?${next.toString()}`
  }
  const exportQuery = () => {
    const next = new URLSearchParams(params)
    next.delete('page')
    return next.toString()
  }

  const run = (action: Promise<unknown>) => {
    setActionError('')
    action.then(reload).catch((e: Error) => setActionError(e.message))
  }
  const approve = (id: string) =>
    run(api(`/api/admin/receipts/${id}/review`, { method: 'POST', json: { status: 'APPROVED' } }))
  const download = (format: 'xlsx' | 'pdf') => {
    setActionError('')
    downloadFile(`/api/admin/export?format=${format}&${exportQuery()}`, `receipts.${format}`).catch((e: Error) =>
      setActionError(e.message),
    )
  }

  return (
    <div className="space-y-4">
      <PageHeader title="Receipts Documented" crumbs={[{ label: 'Dashboard', href: '/admin' }, { label: 'Receipts' }]}>
        <button type="button" className="btn-secondary" onClick={() => download('xlsx')}>
          <Icon name="excel" />
          Export Excel
        </button>
        <button type="button" className="btn-secondary" onClick={() => download('pdf')}>
          <Icon name="pdf" />
          Export PDF
        </button>
      </PageHeader>

      <form
        className="card grid grid-cols-2 gap-3 lg:grid-cols-6"
        onSubmit={(e) => {
          e.preventDefault()
          setParams(withParams(form))
        }}
      >
        <div>
          <label className="label" htmlFor="status">
            Status
          </label>
          <select
            className="input"
            id="status"
            value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value })}
          >
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
          <select
            className="input"
            id="purposeId"
            value={form.purposeId}
            onChange={(e) => setForm({ ...form, purposeId: e.target.value })}
          >
            <option value="">All</option>
            {data?.purposes.map((p) => (
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
          <input
            className="input"
            id="from"
            type="date"
            value={form.from}
            onChange={(e) => setForm({ ...form, from: e.target.value })}
          />
        </div>
        <div>
          <label className="label" htmlFor="to">
            To
          </label>
          <input
            className="input"
            id="to"
            type="date"
            value={form.to}
            onChange={(e) => setForm({ ...form, to: e.target.value })}
          />
        </div>
        <div>
          <label className="label" htmlFor="q">
            Search
          </label>
          <input
            className="input"
            id="q"
            placeholder="Vendor or note"
            value={form.q}
            onChange={(e) => setForm({ ...form, q: e.target.value })}
          />
        </div>
        <div className="flex items-end gap-2">
          <button className="btn flex-1">Apply</button>
          <Link className="btn-secondary" to="/admin/receipts">
            Clear
          </Link>
        </div>
      </form>

      {(error || actionError) && <p className="text-sm text-red-700">{error || actionError}</p>}

      <div className="card p-0">
        <div className="tabs px-4 pt-3">
          {TABS.map((t) => (
            <Link
              key={t.value}
              to={`/admin/receipts?${withParams({ direction: t.value }).toString()}`}
              className={`tab ${direction === t.value ? 'tab-active' : ''}`}
            >
              {t.label}
            </Link>
          ))}
        </div>
        {/* Phones get a card per receipt; a wide table would need sideways scrolling */}
        <ul className="divide-y divide-slate-100 md:hidden">
          {data?.receipts.map((r) => (
            <li key={r.id} className="px-4 py-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-semibold text-slate-900">{r.purposeName}</p>
                  <p className="truncate text-xs text-slate-500">
                    {formatDate(r.receiptDate)} · {directionLabel(r.direction)}
                    {r.counterparty && ` · ${r.counterparty}`}
                  </p>
                  {r.payerName && <p className="text-xs text-slate-500">Paid by {r.payerName}</p>}
                </div>
                <p className="shrink-0 font-extrabold tabular-nums">{formatRM(r.amountCents)}</p>
              </div>
              <div className="mt-1 flex items-center justify-between gap-2">
                <div className="flex flex-wrap gap-1">
                  <StatusBadge status={r.status} />
                  {r.possibleDuplicate && <DuplicateBadge />}
                </div>
                <div className="flex items-center gap-1">
                  {r.status === 'PENDING' && (
                    <button type="button" onClick={() => approve(r.id)} className="tap text-sm font-semibold text-green-700">
                      Approve
                    </button>
                  )}
                  <Link to={`/admin/receipts/${r.id}`} className="link tap">
                    Open
                  </Link>
                </div>
              </div>
            </li>
          ))}
          {data && data.receipts.length === 0 && <li className="px-4 py-3 text-slate-500">No receipts match these filters.</li>}
          {!data && !error && <li className="px-4 py-3 text-slate-500">Loading…</li>}
        </ul>
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-[720px]">
            <thead>
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
              {data?.receipts.map((r) => (
                <tr key={r.id}>
                  <td className="td whitespace-nowrap">{formatDate(r.receiptDate)}</td>
                  <td className="td">{directionLabel(r.direction)}</td>
                  <td className="td">{r.purposeName}</td>
                  <td className="td">{r.counterparty || '—'}</td>
                  <td className="td">{r.payerName ?? '—'}</td>
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
                        <button
                          type="button"
                          onClick={() => approve(r.id)}
                          className="text-sm font-semibold text-green-700 hover:underline"
                        >
                          Approve
                        </button>
                      )}
                      <Link to={`/admin/receipts/${r.id}`} className="link">
                        Open
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
              {data && data.receipts.length === 0 && (
                <tr>
                  <td className="td text-slate-500" colSpan={8}>
                    No receipts match these filters.
                  </td>
                </tr>
              )}
              {!data && !error && (
                <tr>
                  <td className="td text-slate-500" colSpan={8}>
                    Loading…
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {data && (
          <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-1 border-t border-slate-200 px-4 py-3">
            <span className="text-xs font-semibold text-slate-500">
              {data.count} receipt{data.count === 1 ? '' : 's'}
            </span>
            <span className="flex flex-wrap gap-x-6 text-sm font-extrabold">
              <span className="text-green-700">
                TOTAL IN <span className="ml-2 tabular-nums">{formatRM(data.totalIn)}</span>
              </span>
              <span className="text-brand-700">
                TOTAL OUT <span className="ml-2 tabular-nums">{formatRM(data.totalOut)}</span>
              </span>
            </span>
          </div>
        )}
      </div>

      {data && data.pages > 1 && (
        <div className="flex items-center justify-between text-sm">
          {data.page > 1 ? (
            <Link className="link tap" to={pageLink(data.page - 1)}>
              Previous
            </Link>
          ) : (
            <span />
          )}
          <span className="text-slate-500">
            Page {data.page} of {data.pages}
          </span>
          {data.page < data.pages ? (
            <Link className="link tap" to={pageLink(data.page + 1)}>
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
