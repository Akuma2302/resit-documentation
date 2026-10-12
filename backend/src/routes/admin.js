const bcrypt = require('bcryptjs')
const express = require('express')
const db = require('../db')
const { handle } = require('../auth')
const { toPdf, toRows, toXlsx } = require('../export')
const { parseDateInput, toDateInput } = require('../format')
const { toId } = require('../ids')
const {
  findDuplicate,
  parseReceiptFields,
  readFilters,
  receiptInclude,
  receiptWhere,
  toReceiptJson,
} = require('../receipts')

const router = express.Router()

const PAGE_SIZE = 50
const MAX_EXPORT_ROWS = 5000

// ----- Dashboard -----

// Receipt dates are stored as UTC midnight, so "now" is shifted to Malaysia time (UTC+8)
// before picking month boundaries.
function malaysiaToday() {
  return new Date(Date.now() + 8 * 3_600_000)
}

function periodRange(period, from, to) {
  const now = malaysiaToday()
  const y = now.getUTCFullYear()
  const m = now.getUTCMonth()
  if (period === 'custom') {
    const gte = parseDateInput(from)
    const lte = parseDateInput(to)
    return { ...(gte && { gte }), ...(lte && { lte }) }
  }
  if (period === 'last-month') return { gte: new Date(Date.UTC(y, m - 1, 1)), lte: new Date(Date.UTC(y, m, 0)) }
  if (period === 'this-year') return { gte: new Date(Date.UTC(y, 0, 1)), lte: new Date(Date.UTC(y, 11, 31)) }
  if (period === 'all') return {}
  return { gte: new Date(Date.UTC(y, m, 1)), lte: new Date(Date.UTC(y, m + 1, 0)) }
}

router.get(
  '/dashboard',
  handle(async (req, res) => {
    const range = periodRange(req.query.period, req.query.from, req.query.to)
    const approved = { status: 'APPROVED', ...(Object.keys(range).length && { receiptDate: range }) }

    const now = malaysiaToday()
    const chartStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 11, 1))

    const [sums, byPurpose, byPayer, purposes, payers, pending, monthly, recent] = await Promise.all([
      db.receipt.groupBy({ by: ['direction'], where: approved, _sum: { amountCents: true }, _count: true }),
      db.receipt.groupBy({ by: ['purposeId'], where: { ...approved, direction: 'OUT' }, _sum: { amountCents: true } }),
      db.receipt.groupBy({ by: ['payerId'], where: { ...approved, direction: 'OUT' }, _sum: { amountCents: true } }),
      db.purpose.findMany(),
      db.payer.findMany(),
      db.receipt.aggregate({ where: { status: 'PENDING' }, _count: true, _sum: { amountCents: true } }),
      db.receipt.findMany({
        where: { status: 'APPROVED', receiptDate: { gte: chartStart } },
        select: { receiptDate: true, direction: true, amountCents: true },
      }),
      db.receipt.findMany({ include: receiptInclude, orderBy: { createdAt: 'desc' }, take: 8 }),
    ])

    const sumFor = (direction) => sums.find((s) => s.direction === direction)?._sum.amountCents ?? 0
    const bars = (rows, key, names, fallback) =>
      rows
        .map((row) => ({
          label: names.find((n) => n.id === row[key])?.name ?? fallback,
          cents: row._sum.amountCents ?? 0,
        }))
        .sort((a, b) => b.cents - a.cents)

    const months = Array.from({ length: 12 }, (_, i) => {
      const date = new Date(Date.UTC(chartStart.getUTCFullYear(), chartStart.getUTCMonth() + i, 1))
      return {
        key: toDateInput(date).slice(0, 7),
        label: date.toLocaleDateString('en-MY', { month: 'short', year: 'numeric', timeZone: 'UTC' }),
        inCents: 0,
        outCents: 0,
      }
    })
    for (const r of monthly) {
      const month = months.find((m) => m.key === toDateInput(r.receiptDate).slice(0, 7))
      if (!month) continue
      if (r.direction === 'IN') month.inCents += r.amountCents
      else month.outCents += r.amountCents
    }

    res.json({
      totalIn: sumFor('IN'),
      totalOut: sumFor('OUT'),
      approvedCount: sums.reduce((sum, s) => sum + s._count, 0),
      pendingCount: pending._count,
      pendingCents: pending._sum.amountCents ?? 0,
      purposeBars: bars(byPurpose, 'purposeId', purposes, 'Unknown'),
      payerBars: bars(byPayer, 'payerId', payers, 'Not recorded'),
      months,
      recent: recent.map(toReceiptJson),
    })
  }),
)

// ----- Receipts -----

router.get(
  '/receipts',
  handle(async (req, res) => {
    const where = receiptWhere(readFilters(req.query))
    const page = Math.max(1, Number(req.query.page) || 1)
    const [receipts, count, sums, purposes] = await Promise.all([
      db.receipt.findMany({
        where,
        include: receiptInclude,
        orderBy: [{ receiptDate: 'desc' }, { createdAt: 'desc' }],
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
      }),
      db.receipt.count({ where }),
      db.receipt.groupBy({ by: ['direction'], where, _sum: { amountCents: true } }),
      db.purpose.findMany({ orderBy: { createdAt: 'asc' } }),
    ])
    res.json({
      receipts: receipts.map(toReceiptJson),
      count,
      page,
      pages: Math.max(1, Math.ceil(count / PAGE_SIZE)),
      totalIn: sums.find((s) => s.direction === 'IN')?._sum.amountCents ?? 0,
      totalOut: sums.find((s) => s.direction === 'OUT')?._sum.amountCents ?? 0,
      purposes,
    })
  }),
)

router.get(
  '/receipts/:id',
  handle(async (req, res) => {
    const receipt = await db.receipt.findUnique({ where: { id: toId(req.params.id) }, include: receiptInclude })
    if (!receipt) return res.status(404).json({ error: 'Receipt not found' })
    // Keep the receipt's own purpose and payer selectable even if they were switched off later
    const [purposes, payers] = await Promise.all([
      db.purpose.findMany({ where: { OR: [{ active: true }, { id: receipt.purposeId }] }, orderBy: { createdAt: 'asc' } }),
      db.payer.findMany({ where: { OR: [{ active: true }, { id: toId(receipt.payerId) }] }, orderBy: { createdAt: 'asc' } }),
    ])
    res.json({ receipt: toReceiptJson(receipt), purposes, payers })
  }),
)

router.put(
  '/receipts/:id',
  handle(async (req, res) => {
    const id = toId(req.params.id)
    if (!(await db.receipt.findUnique({ where: { id }, select: { id: true } }))) {
      return res.status(404).json({ error: 'Receipt not found' })
    }
    const parsed = await parseReceiptFields(req.body)
    if (parsed.error) return res.status(400).json({ error: parsed.error })
    const duplicate = await findDuplicate(parsed.data, id)
    const receipt = await db.receipt.update({
      where: { id },
      data: { ...parsed.data, possibleDuplicate: Boolean(duplicate) },
      include: receiptInclude,
    })
    res.json({ receipt: toReceiptJson(receipt) })
  }),
)

router.post(
  '/receipts/:id/review',
  handle(async (req, res) => {
    const id = toId(req.params.id)
    const status = String(req.body.status)
    if (!['APPROVED', 'REJECTED', 'PENDING'].includes(status)) return res.status(400).json({ error: 'Invalid status' })
    if (!(await db.receipt.findUnique({ where: { id }, select: { id: true } }))) {
      return res.status(404).json({ error: 'Receipt not found' })
    }
    const receipt = await db.receipt.update({
      where: { id },
      data:
        status === 'PENDING'
          ? { status, reviewedById: null, reviewedAt: null }
          : { status, reviewedById: req.user.id, reviewedAt: new Date() },
      include: receiptInclude,
    })
    res.json({ receipt: toReceiptJson(receipt) })
  }),
)

router.get(
  '/export',
  handle(async (req, res) => {
    const receipts = await db.receipt.findMany({
      where: receiptWhere(readFilters(req.query)),
      include: receiptInclude,
      orderBy: [{ receiptDate: 'desc' }, { createdAt: 'desc' }],
      take: MAX_EXPORT_ROWS,
    })
    const rows = toRows(receipts)
    const pdf = req.query.format === 'pdf'
    const file = pdf ? await toPdf(rows) : await toXlsx(rows)
    const stamp = new Date().toISOString().slice(0, 10)
    res.set({
      'Content-Type': pdf ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="receipts-${stamp}.${pdf ? 'pdf' : 'xlsx'}"`,
    })
    res.send(file)
  }),
)

// ----- Settings -----

router.get(
  '/settings',
  handle(async (_req, res) => {
    const [purposes, payers, users] = await Promise.all([
      db.purpose.findMany({ orderBy: [{ direction: 'asc' }, { createdAt: 'asc' }] }),
      db.payer.findMany({ orderBy: { createdAt: 'asc' } }),
      db.user.findMany({
        orderBy: { createdAt: 'asc' },
        select: { id: true, name: true, email: true, role: true, active: true },
      }),
    ])
    res.json({ purposes, payers, users })
  }),
)

router.post(
  '/purposes',
  handle(async (req, res) => {
    const name = String(req.body.name ?? '').trim()
    const direction = req.body.direction === 'IN' ? 'IN' : 'OUT'
    if (!name) return res.status(400).json({ error: 'Enter a name.' })
    if (await db.purpose.findUnique({ where: { name } })) {
      return res.status(400).json({ error: 'That purpose already exists.' })
    }
    await db.purpose.create({ data: { name, direction } })
    res.json({ ok: `Added "${name}".` })
  }),
)

router.post(
  '/payers',
  handle(async (req, res) => {
    const name = String(req.body.name ?? '').trim()
    if (!name) return res.status(400).json({ error: 'Enter a name.' })
    if (await db.payer.findUnique({ where: { name } })) return res.status(400).json({ error: 'That payer already exists.' })
    await db.payer.create({ data: { name } })
    res.json({ ok: `Added "${name}".` })
  }),
)

// Lists are switched off rather than deleted so old receipts keep their labels.
router.post(
  '/toggle',
  handle(async (req, res) => {
    const id = toId(req.body.id)
    const active = req.body.active === true
    const model = { purpose: db.purpose, payer: db.payer, user: db.user }[req.body.kind]
    if (!model) return res.status(400).json({ error: 'Invalid kind' })
    if (req.body.kind === 'user' && id === req.user.id) {
      return res.status(400).json({ error: 'You cannot switch off your own account.' })
    }
    if (!(await model.findUnique({ where: { id } }))) return res.status(404).json({ error: 'Not found' })
    await model.update({ where: { id }, data: { active } })
    res.json({ ok: 'Updated.' })
  }),
)

router.post(
  '/users',
  handle(async (req, res) => {
    const name = String(req.body.name ?? '').trim()
    const email = String(req.body.email ?? '').trim().toLowerCase()
    const password = String(req.body.password ?? '')
    const role = req.body.role === 'ADMIN' ? 'ADMIN' : 'USER'
    if (!name || !/^\S+@\S+\.\S+$/.test(email)) return res.status(400).json({ error: 'Enter a name and a valid email.' })
    if (password.length < 8) return res.status(400).json({ error: 'The password needs at least 8 characters.' })
    if (await db.user.findUnique({ where: { email } })) {
      return res.status(400).json({ error: 'That email is already registered.' })
    }
    await db.user.create({ data: { name, email, role, passwordHash: await bcrypt.hash(password, 10) } })
    res.json({ ok: `Added ${name}.` })
  }),
)

router.post(
  '/users/:id/password',
  handle(async (req, res) => {
    const id = toId(req.params.id)
    const password = String(req.body.password ?? '')
    if (password.length < 8) return res.status(400).json({ error: 'The password needs at least 8 characters.' })
    if (!(await db.user.findUnique({ where: { id } }))) return res.status(404).json({ error: 'User not found' })
    await db.user.update({ where: { id }, data: { passwordHash: await bcrypt.hash(password, 10) } })
    res.json({ ok: 'Password changed.' })
  }),
)

module.exports = router
