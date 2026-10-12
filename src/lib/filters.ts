import type { Prisma } from '@prisma/client'
import { parseDateInput } from './format'

export type ReceiptFilters = {
  direction?: string
  status?: string
  purposeId?: string
  from?: string
  to?: string
  q?: string
}

type Params = Record<string, string | string[] | undefined> | URLSearchParams

// Reads the receipt list filters from page searchParams or a request URL.
export function readFilters(params: Params): ReceiptFilters {
  const get = (key: string) => {
    const value = params instanceof URLSearchParams ? params.get(key) : params[key]
    return (Array.isArray(value) ? value[0] : value) || undefined
  }
  return {
    direction: get('direction'),
    status: get('status'),
    purposeId: get('purposeId'),
    from: get('from'),
    to: get('to'),
    q: get('q'),
  }
}

export function receiptWhere(f: ReceiptFilters): Prisma.ReceiptWhereInput {
  const where: Prisma.ReceiptWhereInput = {}
  if (f.direction === 'IN' || f.direction === 'OUT') where.direction = f.direction
  if (f.status && ['PENDING', 'APPROVED', 'REJECTED'].includes(f.status)) where.status = f.status
  if (f.purposeId && /^\d+$/.test(f.purposeId)) where.purposeId = Number(f.purposeId)
  const from = f.from ? parseDateInput(f.from) : null
  const to = f.to ? parseDateInput(f.to) : null
  if (from || to) where.receiptDate = { ...(from && { gte: from }), ...(to && { lte: to }) }
  if (f.q) where.OR = [{ counterparty: { contains: f.q } }, { note: { contains: f.q } }]
  return where
}

export function filtersToQuery(f: ReceiptFilters) {
  const qs = new URLSearchParams()
  for (const [key, value] of Object.entries(f)) if (value) qs.set(key, value)
  return qs.toString()
}
