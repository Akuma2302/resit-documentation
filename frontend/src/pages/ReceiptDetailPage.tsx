import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { AuthImage } from '@/components/AuthImage'
import { PageHeader } from '@/components/PageHeader'
import { ReceiptFields, type ReceiptValues } from '@/components/ReceiptFields'
import { DuplicateBadge, StatusBadge } from '@/components/StatusBadge'
import { api } from '@/lib/api'
import { centsToInput, formatDay } from '@/lib/format'
import type { Option, PurposeOption, Receipt } from '@/lib/types'
import { useApi } from '@/lib/useApi'

type Detail = { receipt: Receipt; purposes: PurposeOption[]; payers: Option[] }

const toValues = (r: Receipt): ReceiptValues => ({
  amount: centsToInput(r.amountCents),
  date: r.receiptDate,
  purposeId: r.purposeId,
  payerId: r.payerId ?? '',
  paidByName: r.paidByName,
  paidFromAccount: r.paidFromAccount,
  accountHolder: r.accountHolder,
  accountBank: r.accountBank,
  accountNumber: r.accountNumber,
  counterparty: r.counterparty,
  note: r.note,
})

export function ReceiptDetailPage() {
  const { id } = useParams()
  const { data, error } = useApi<Detail>(`/api/admin/receipts/${id}`)
  const [receipt, setReceipt] = useState<Receipt | null>(null)
  const [values, setValues] = useState<ReceiptValues | null>(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ ok?: string; error?: string }>({})

  useEffect(() => {
    if (!data) return
    setReceipt(data.receipt)
    setValues(toValues(data.receipt))
  }, [data])

  const crumbs = [
    { label: 'Dashboard', href: '/admin' },
    { label: 'Receipts', href: '/admin/receipts' },
    // Mongo ids are long, so the breadcrumb shows a short reference
    { label: `Receipt ${(id ?? '').slice(-6).toUpperCase()}` },
  ]

  if (error) {
    return (
      <div>
        <PageHeader title="Receipt Update" crumbs={crumbs} />
        <p className="text-sm text-red-700">{error}</p>
      </div>
    )
  }
  if (!data || !receipt || !values) return <p className="text-sm text-slate-500">Loading…</p>

  async function send(request: Promise<{ receipt: Receipt }>, ok: string) {
    setBusy(true)
    setMessage({})
    try {
      const res = await request
      setReceipt(res.receipt)
      setValues(toValues(res.receipt))
      setMessage({ ok })
    } catch (e) {
      setMessage({ error: e instanceof Error ? e.message : 'Something went wrong.' })
    }
    setBusy(false)
  }
  const review = (status: Receipt['status'], ok: string) =>
    send(api(`/api/admin/receipts/${receipt.id}/review`, { method: 'POST', json: { status } }), ok)

  return (
    <div className="space-y-4">
      <PageHeader title="Receipt Update" crumbs={crumbs}>
        <StatusBadge status={receipt.status} />
        {receipt.possibleDuplicate && <DuplicateBadge />}
      </PageHeader>
      <p className="text-sm text-slate-600">
        Submitted by {receipt.submittedBy} on {formatDay(receipt.createdAt)}
        {receipt.reviewedBy && receipt.reviewedAt && (
          <>
            {' '}
            · {receipt.status === 'APPROVED' ? 'Approved' : 'Rejected'} by {receipt.reviewedBy} on{' '}
            {formatDay(receipt.reviewedAt)}
          </>
        )}
      </p>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="card">
          <h2 className="card-title">Receipt image</h2>
          <AuthImage block receiptId={receipt.id} className="mx-auto max-h-[36rem] min-h-[8rem] w-full rounded-lg object-contain" />
        </div>

        <div className="space-y-4">
          <div className="panel">
            <h2 className="panel-head">Approval</h2>
            <div className="panel-body flex flex-wrap items-center gap-2">
              {receipt.status !== 'APPROVED' && (
                <button type="button" className="btn-success" disabled={busy} onClick={() => review('APPROVED', 'Approved.')}>
                  Approve
                </button>
              )}
              {receipt.status !== 'REJECTED' && (
                <button type="button" className="btn-danger" disabled={busy} onClick={() => review('REJECTED', 'Rejected.')}>
                  Reject
                </button>
              )}
              {receipt.status !== 'PENDING' && (
                <button
                  type="button"
                  className="btn-secondary"
                  disabled={busy}
                  onClick={() => review('PENDING', 'Moved back to pending.')}
                >
                  Back to pending
                </button>
              )}
              <p className="w-full text-xs text-slate-500">Only approved receipts count in the dashboard totals.</p>
            </div>
          </div>

          <form
            className="card space-y-4"
            onSubmit={(e) => {
              e.preventDefault()
              send(api(`/api/admin/receipts/${receipt.id}`, { method: 'PUT', json: values }), 'Changes saved.')
            }}
          >
            <h2 className="card-title">Receipt details</h2>
            <ReceiptFields purposes={data.purposes} payers={data.payers} values={values} onChange={setValues} />
            {message.error && <p className="text-sm text-red-700">{message.error}</p>}
            {message.ok && <p className="text-sm text-green-700">{message.ok}</p>}
            <button className="btn" disabled={busy}>
              {busy ? 'Saving…' : 'Save changes'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
