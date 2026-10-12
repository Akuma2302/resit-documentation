const db = require('./db')
const { parseAmountToCents, parseDateInput } = require('./format')
const { isId, toId } = require('./ids')

// A payer called "Staff" covers many people, so the receipt also records which one.
const needsPersonName = (payer) => /staff/i.test(payer.name)

// Validates the fields shared by the capture form and the admin edit form.
// Returns { data } or { error }.
async function parseReceiptFields(body) {
  const amountCents = parseAmountToCents(body.amount)
  if (!amountCents) return { error: 'Enter a valid price, for example 12.50.' }

  const receiptDate = parseDateInput(body.date)
  if (!receiptDate) return { error: 'Choose the receipt date.' }

  const purpose = await db.purpose.findUnique({ where: { id: toId(body.purposeId) } })
  if (!purpose) return { error: 'Choose what the receipt is for.' }

  let payerId = null
  let paidByName = null
  if (purpose.direction === 'OUT') {
    const payer = await db.payer.findUnique({ where: { id: toId(body.payerId) } })
    if (!payer) return { error: 'Choose who paid.' }
    payerId = payer.id
    if (needsPersonName(payer)) {
      paidByName = String(body.paidByName ?? '').trim().slice(0, 80)
      if (!paidByName) return { error: 'Enter the name of the staff member who paid.' }
    }
  }

  return {
    data: {
      amountCents,
      receiptDate,
      direction: purpose.direction,
      purposeId: purpose.id,
      payerId,
      paidByName,
      counterparty: String(body.counterparty ?? '').trim().slice(0, 120),
      note: String(body.note ?? '').trim().slice(0, 1000),
    },
  }
}

// A receipt with the same amount, date and vendor as an earlier one is probably a duplicate.
async function findDuplicate(fields, excludeId) {
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

const receiptInclude = {
  purpose: true,
  payer: true,
  submittedBy: { select: { name: true } },
  reviewedBy: { select: { name: true } },
}

// Shape sent to the frontend. Use with `include: receiptInclude`.
function toReceiptJson(r) {
  return {
    id: r.id,
    amountCents: r.amountCents,
    receiptDate: r.receiptDate.toISOString().slice(0, 10),
    direction: r.direction,
    purposeId: r.purposeId,
    purposeName: r.purpose.name,
    payerId: r.payerId,
    payerName: r.payer ? r.payer.name : null,
    paidByName: r.paidByName ?? '',
    counterparty: r.counterparty,
    note: r.note,
    status: r.status,
    possibleDuplicate: r.possibleDuplicate,
    submittedBy: r.submittedBy.name,
    reviewedBy: r.reviewedBy ? r.reviewedBy.name : null,
    reviewedAt: r.reviewedAt,
    createdAt: r.createdAt,
  }
}

function readFilters(query) {
  const get = (key) => (typeof query[key] === 'string' && query[key] ? query[key] : undefined)
  return {
    direction: get('direction'),
    status: get('status'),
    purposeId: get('purposeId'),
    from: get('from'),
    to: get('to'),
    q: get('q'),
  }
}

function receiptWhere(f) {
  const where = {}
  if (f.direction === 'IN' || f.direction === 'OUT') where.direction = f.direction
  if (['PENDING', 'APPROVED', 'REJECTED'].includes(f.status)) where.status = f.status
  if (isId(f.purposeId)) where.purposeId = f.purposeId
  const from = parseDateInput(f.from)
  const to = parseDateInput(f.to)
  if (from || to) where.receiptDate = { ...(from && { gte: from }), ...(to && { lte: to }) }
  if (f.q) {
    where.OR = [
      { counterparty: { contains: f.q, mode: 'insensitive' } },
      { note: { contains: f.q, mode: 'insensitive' } },
    ]
  }
  return where
}

module.exports = { parseReceiptFields, findDuplicate, receiptInclude, toReceiptJson, readFilters, receiptWhere }
