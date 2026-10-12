const express = require('express')
const multer = require('multer')
const db = require('../db')
const { handle } = require('../auth')
const { formatDate } = require('../format')
const { toId } = require('../ids')
const { findDuplicate, parseReceiptFields, receiptInclude, toReceiptJson } = require('../receipts')

const router = express.Router()

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 8 * 1024 * 1024, files: 1 } })

// The dropdown choices for the capture form
router.get(
  '/options',
  handle(async (_req, res) => {
    const [purposes, payers] = await Promise.all([
      db.purpose.findMany({ where: { active: true }, orderBy: { createdAt: 'asc' } }),
      db.payer.findMany({ where: { active: true }, orderBy: { createdAt: 'asc' } }),
    ])
    res.json({ purposes, payers })
  }),
)

// The logged-in user's own receipts
router.get(
  '/receipts',
  handle(async (req, res) => {
    const receipts = await db.receipt.findMany({
      where: { submittedById: req.user.id },
      include: receiptInclude,
      orderBy: { createdAt: 'desc' },
      take: 100,
    })
    res.json({ receipts: receipts.map(toReceiptJson) })
  }),
)

router.post(
  '/receipts',
  upload.single('image'),
  handle(async (req, res) => {
    if (!req.file || req.file.size === 0) return res.status(400).json({ error: 'Attach a photo of the receipt.' })
    if (!IMAGE_TYPES.includes(req.file.mimetype)) {
      return res.status(400).json({ error: 'The receipt must be a JPG, PNG or WebP image.' })
    }

    const parsed = await parseReceiptFields(req.body)
    if (parsed.error) return res.status(400).json({ error: parsed.error })

    const duplicate = await findDuplicate(parsed.data)
    if (duplicate && req.body.confirmDuplicate !== 'yes') {
      return res.status(409).json({
        duplicate: `A receipt with the same price, date and vendor was already submitted by ${duplicate.submittedBy.name} on ${formatDate(duplicate.createdAt)}.`,
      })
    }

    const receipt = await db.receipt.create({
      data: {
        ...parsed.data,
        possibleDuplicate: Boolean(duplicate),
        submittedById: req.user.id,
        image: { create: { contentType: req.file.mimetype, data: req.file.buffer } },
      },
    })
    res.json({ id: receipt.id })
  }),
)

router.get(
  '/receipts/:id/image',
  handle(async (req, res) => {
    const id = toId(req.params.id)
    const receipt = await db.receipt.findUnique({ where: { id }, select: { submittedById: true } })
    if (!receipt) return res.status(404).json({ error: 'Not found' })
    if (req.user.role !== 'ADMIN' && receipt.submittedById !== req.user.id) {
      return res.status(403).json({ error: 'Not allowed' })
    }
    const image = await db.receiptImage.findUnique({ where: { receiptId: id } })
    if (!image) return res.status(404).json({ error: 'Image missing' })
    res.set({ 'Content-Type': image.contentType, 'Cache-Control': 'private, max-age=3600' })
    res.send(Buffer.from(image.data))
  }),
)

module.exports = router
