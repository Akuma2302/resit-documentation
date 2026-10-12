import { CaptureForm } from '@/components/CaptureForm'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

export default async function CapturePage() {
  const [purposes, payers] = await Promise.all([
    db.purpose.findMany({ where: { active: true }, orderBy: { id: 'asc' } }),
    db.payer.findMany({ where: { active: true }, orderBy: { id: 'asc' } }),
  ])
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">New receipt</h1>
      <CaptureForm purposes={purposes} payers={payers} />
    </div>
  )
}
