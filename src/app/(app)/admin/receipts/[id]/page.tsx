import { notFound } from 'next/navigation'
import { reviewReceipt } from '@/app/actions'
import { EditReceiptForm } from '@/components/EditReceiptForm'
import { PageHeader } from '@/components/PageHeader'
import { DuplicateBadge, StatusBadge } from '@/components/StatusBadge'
import { requireAdmin } from '@/lib/auth'
import { db } from '@/lib/db'
import { centsToInput, formatDate, toDateInput } from '@/lib/format'

export const dynamic = 'force-dynamic'

export default async function ReceiptDetailPage({ params }: { params: { id: string } }) {
  await requireAdmin()
  const receipt = await db.receipt.findUnique({
    where: { id: Number(params.id) || 0 },
    include: { submittedBy: { select: { name: true } }, reviewedBy: { select: { name: true } } },
  })
  if (!receipt) notFound()

  // Keep the receipt's own purpose and payer selectable even if they were switched off later
  const [purposes, payers] = await Promise.all([
    db.purpose.findMany({ where: { OR: [{ active: true }, { id: receipt.purposeId }] }, orderBy: { id: 'asc' } }),
    db.payer.findMany({ where: { OR: [{ active: true }, { id: receipt.payerId ?? 0 }] }, orderBy: { id: 'asc' } }),
  ])

  return (
    <div className="space-y-4">
      <PageHeader
        title="Receipt Update"
        crumbs={[
          { label: 'Dashboard', href: '/admin' },
          { label: 'Receipts', href: '/admin/receipts' },
          { label: `Receipt #${receipt.id}` },
        ]}
      >
        <StatusBadge status={receipt.status} />
        {receipt.possibleDuplicate && <DuplicateBadge />}
      </PageHeader>
      <p className="text-sm text-slate-600">
        Submitted by {receipt.submittedBy.name} on {formatDate(receipt.createdAt)}
        {receipt.reviewedBy && receipt.reviewedAt && (
          <>
            {' '}
            · {receipt.status === 'APPROVED' ? 'Approved' : 'Rejected'} by {receipt.reviewedBy.name} on{' '}
            {formatDate(receipt.reviewedAt)}
          </>
        )}
      </p>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="card">
          <h2 className="card-title">Receipt image</h2>
          <a href={`/api/receipts/${receipt.id}/image`} target="_blank">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/api/receipts/${receipt.id}/image`}
              alt="Receipt"
              className="mx-auto max-h-[36rem] rounded-lg object-contain"
            />
          </a>
        </div>

        <div className="space-y-4">
          <form action={reviewReceipt} className="panel">
            <h2 className="panel-head">Approval</h2>
            <div className="panel-body flex flex-wrap items-center gap-2">
            <input type="hidden" name="id" value={receipt.id} />
            {receipt.status !== 'APPROVED' && (
              <button name="status" value="APPROVED" className="btn-success">
                Approve
              </button>
            )}
            {receipt.status !== 'REJECTED' && (
              <button name="status" value="REJECTED" className="btn-danger">
                Reject
              </button>
            )}
            {receipt.status !== 'PENDING' && (
              <button name="status" value="PENDING" className="btn-secondary">
                Back to pending
              </button>
            )}
            <p className="w-full text-xs text-slate-500">Only approved receipts count in the dashboard totals.</p>
            </div>
          </form>

          <div className="card">
            <h2 className="card-title">Receipt details</h2>
            <EditReceiptForm
              id={receipt.id}
              purposes={purposes}
              payers={payers}
              initial={{
                amount: centsToInput(receipt.amountCents),
                date: toDateInput(receipt.receiptDate),
                purposeId: String(receipt.purposeId),
                payerId: receipt.payerId ? String(receipt.payerId) : '',
                counterparty: receipt.counterparty,
                note: receipt.note,
              }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
