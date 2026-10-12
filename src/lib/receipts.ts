import { randomUUID } from 'crypto'
import { db } from './db'
import { parseAmountToCents, parseDateInput } from './format'
import { putImage } from './storage'

const IMAGE_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
}
const MAX_IMAGE_BYTES = 8 * 1024 * 1024

export async function saveReceiptImage(file: Blob): Promise<{ name: string } | { error: string }> {
  const ext = IMAGE_TYPES[file.type]
  if (!ext) return { error: 'The receipt must be a JPG, PNG or WebP image.' }
  if (file.size > MAX_IMAGE_BYTES) return { error: 'The image is larger than 8 MB.' }
  const name = `${randomUUID()}.${ext}`
  await putImage(name, await file.arrayBuffer())
  return { name }
}

export type ReceiptFields = {
  amountCents: number
  receiptDate: Date
  direction: string
  purposeId: number
  payerId: number | null
  counterparty: string
  note: string
}

// Validates the fields shared by the capture form and the admin edit form.
export async function parseReceiptFields(form: FormData): Promise<{ data: ReceiptFields } | { error: string }> {
  const amountCents = parseAmountToCents(String(form.get('amount') ?? ''))
  if (!amountCents) return { error: 'Enter a valid price, for example 12.50.' }

  const receiptDate = parseDateInput(String(form.get('date') ?? ''))
  if (!receiptDate) return { error: 'Choose the receipt date.' }

  const purpose = await db.purpose.findUnique({ where: { id: Number(form.get('purposeId')) || 0 } })
  if (!purpose) return { error: 'Choose what the receipt is for.' }

  let payerId: number | null = null
  if (purpose.direction === 'OUT') {
    const payer = await db.payer.findUnique({ where: { id: Number(form.get('payerId')) || 0 } })
    if (!payer) return { error: 'Choose who paid.' }
    payerId = payer.id
  }

  return {
    data: {
      amountCents,
      receiptDate,
      direction: purpose.direction,
      purposeId: purpose.id,
      payerId,
      counterparty: String(form.get('counterparty') ?? '').trim().slice(0, 120),
      note: String(form.get('note') ?? '').trim().slice(0, 1000),
    },
  }
}

// A receipt with the same amount, date and vendor as an earlier one is probably a duplicate.
export async function findDuplicate(fields: ReceiptFields, excludeId?: number) {
  const candidates = await db.receipt.findMany({
    where: {
      amountCents: fields.amountCents,
      receiptDate: fields.receiptDate,
      status: { not: 'REJECTED' },
      ...(excludeId && { id: { not: excludeId } }),
    },
    include: { submittedBy: { select: { name: true } } },
    orderBy: { createdAt: 'asc' },
  })
  const vendor = fields.counterparty.toLowerCase()
  return candidates.find((c) => c.counterparty.trim().toLowerCase() === vendor) ?? null
}
