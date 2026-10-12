import { CaptureForm } from '@/components/CaptureForm'
import { PageHeader } from '@/components/PageHeader'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

export default async function CapturePage() {
  const [purposes, payers] = await Promise.all([
    db.purpose.findMany({ where: { active: true }, orderBy: { id: 'asc' } }),
    db.payer.findMany({ where: { active: true }, orderBy: { id: 'asc' } }),
  ])
  return (
    <div>
      <PageHeader title="New Receipt" crumbs={[{ label: 'My Receipts', href: '/' }, { label: 'Camera' }]} />
      <CaptureForm purposes={purposes} payers={payers} />
    </div>
  )
}
