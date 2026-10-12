import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'
import { formatDate } from '@/lib/format'
import { findDuplicate, parseReceiptFields, saveReceiptImage } from '@/lib/receipts'

export async function POST(req: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Not logged in' }, { status: 401 })

  // Node 18 has no global File, so uploads are checked as Blob
  const form = await req.formData()
  const image = form.get('image')
  if (!(image instanceof Blob) || image.size === 0) {
    return NextResponse.json({ error: 'Attach a photo of the receipt.' }, { status: 400 })
  }

  const parsed = await parseReceiptFields(form)
  if ('error' in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 })

  const duplicate = await findDuplicate(parsed.data)
  if (duplicate && form.get('confirmDuplicate') !== 'yes') {
    return NextResponse.json(
      {
        duplicate: `A receipt with the same price, date and vendor was already submitted by ${duplicate.submittedBy.name} on ${formatDate(duplicate.createdAt)}.`,
      },
      { status: 409 },
    )
  }

  const saved = await saveReceiptImage(image)
  if ('error' in saved) return NextResponse.json({ error: saved.error }, { status: 400 })

  const receipt = await db.receipt.create({
    data: {
      ...parsed.data,
      imagePath: saved.name,
      possibleDuplicate: Boolean(duplicate),
      submittedById: session.userId,
    },
  })
  return NextResponse.json({ id: receipt.id })
}
