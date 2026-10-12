// Adds sample receipts so the dashboard and lists have something to show.
//
//   node prisma/seed-demo.js           add the demo data (does nothing if it is already there)
//   node prisma/seed-demo.js --remove  delete the demo data again
//
// During a hosted build it runs only when SEED_DEMO is set: "true" adds, "remove" deletes.
// Every demo receipt has a note starting with "[Demo]", which is how removal finds them.

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') })
const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')
const crypto = require('crypto')

const prisma = new PrismaClient()

const DEMO_TAG = '[Demo]'
const DEMO_EMAIL = 'demo.staff@example.com'

// [days ago, purpose, amount in RM, who paid, paid to / received from, note, status]
const RECEIPTS = [
  [1, 'Sale', 1850.0, null, 'Syarikat Maju Jaya', 'Invoice 1042', 'PENDING'],
  [2, 'Buy item', 86.4, 'Staff', 'Kedai Alat Tulis Bestari', 'Printer paper and ink', 'PENDING'],
  [3, 'Transport', 60.0, 'Staff', 'Petronas Jalan Ampang', 'Petrol for delivery van', 'APPROVED'],
  [4, 'Sale', 920.0, null, 'Encik Farid', 'Walk-in order', 'APPROVED'],
  [6, 'Utilities', 312.75, 'Finance', 'Tenaga Nasional', 'Electricity bill', 'APPROVED'],
  [8, 'Buy item', 245.9, 'Admin', 'Mr DIY', 'Shelving and storage boxes', 'APPROVED'],
  [9, 'Sale', 2400.0, null, 'Restoran Seri Wangi', 'Monthly supply order', 'APPROVED'],
  [11, 'Rent', 2500.0, 'Finance', 'Hartanah Sentosa', 'Office rent', 'APPROVED'],
  [13, 'Transport', 45.5, 'Staff', 'Grab', 'Client visit', 'REJECTED'],
  [15, 'Other expense', 130.0, 'Admin', 'Kedai Kunci Lim', 'Spare office keys', 'APPROVED'],
  [18, 'Sale', 1375.5, null, 'Puan Aisyah', 'Catering order', 'APPROVED'],
  [21, 'Utilities', 148.2, 'Finance', 'Unifi', 'Internet bill', 'APPROVED'],
  [24, 'Buy item', 412.0, 'Staff', 'Lotus Wholesale', 'Pantry and cleaning supplies', 'APPROVED'],
  [33, 'Sale', 3100.0, null, 'Syarikat Maju Jaya', 'Invoice 1031', 'APPROVED'],
  [36, 'Utilities', 298.4, 'Finance', 'Tenaga Nasional', 'Electricity bill', 'APPROVED'],
  [41, 'Rent', 2500.0, 'Finance', 'Hartanah Sentosa', 'Office rent', 'APPROVED'],
  [44, 'Buy item', 189.9, 'Admin', 'Popular Bookstore', 'Stationery restock', 'APPROVED'],
  [47, 'Transport', 72.0, 'Staff', 'Shell Bangsar', 'Petrol', 'APPROVED'],
  [52, 'Sale', 1640.0, null, 'Restoran Seri Wangi', 'Monthly supply order', 'APPROVED'],
  [58, 'Salary', 1800.0, 'Finance', 'Part-time helper', 'September wages', 'APPROVED'],
  [66, 'Sale', 2750.0, null, 'Hotel Bintang', 'Event order', 'APPROVED'],
  [71, 'Rent', 2500.0, 'Finance', 'Hartanah Sentosa', 'Office rent', 'APPROVED'],
  [75, 'Utilities', 305.1, 'Finance', 'Tenaga Nasional', 'Electricity bill', 'APPROVED'],
  [80, 'Buy item', 560.0, 'Admin', 'Senheng', 'Office kettle and fan', 'APPROVED'],
  [96, 'Sale', 2210.0, null, 'Syarikat Maju Jaya', 'Invoice 1018', 'APPROVED'],
  [102, 'Rent', 2500.0, 'Finance', 'Hartanah Sentosa', 'Office rent', 'APPROVED'],
  [110, 'Transport', 95.0, 'Staff', 'Petronas Jalan Ampang', 'Petrol for delivery van', 'APPROVED'],
  [127, 'Sale', 1980.0, null, 'Puan Aisyah', 'Catering order', 'APPROVED'],
  [133, 'Rent', 2500.0, 'Finance', 'Hartanah Sentosa', 'Office rent', 'APPROVED'],
  [140, 'Buy item', 320.5, 'Staff', 'Lotus Wholesale', 'Pantry supplies', 'APPROVED'],
]

const escapeXml = (text) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

// A simple drawn receipt, so each demo record has an image to open.
function receiptImage(vendor, date, amount, note) {
  const lines = [
    ['middle', 210, 60, 22, vendor.toUpperCase()],
    ['middle', 210, 88, 13, 'SAMPLE RECEIPT - DEMO DATA'],
    ['start', 40, 140, 15, `Date: ${date.toLocaleDateString('en-GB', { timeZone: 'UTC' })}`],
    ['start', 40, 190, 15, note],
    ['end', 380, 190, 15, amount.toFixed(2)],
    ['start', 40, 260, 19, 'TOTAL RM'],
    ['end', 380, 260, 19, amount.toFixed(2)],
    ['middle', 210, 330, 13, 'Thank you'],
  ]
  const text = lines
    .map(([anchor, x, y, size, value]) => `<text x="${x}" y="${y}" font-size="${size}" text-anchor="${anchor}">${escapeXml(value)}</text>`)
    .join('')
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="420" height="380" font-family="Courier New, monospace"><rect width="420" height="380" fill="#fffef8"/><line x1="40" y1="225" x2="380" y2="225" stroke="#333" stroke-dasharray="4 4"/>${text}</svg>`
  return Buffer.from(svg)
}

async function remove() {
  const receipts = await prisma.receipt.findMany({ where: { note: { startsWith: DEMO_TAG } }, select: { id: true } })
  const ids = receipts.map((r) => r.id)
  await prisma.receiptImage.deleteMany({ where: { receiptId: { in: ids } } })
  await prisma.receipt.deleteMany({ where: { id: { in: ids } } })
  // the demo user can only be deleted once nothing points at it
  const demoUser = await prisma.user.findUnique({ where: { email: DEMO_EMAIL } })
  if (demoUser && (await prisma.receipt.count({ where: { submittedById: demoUser.id } })) === 0) {
    await prisma.user.delete({ where: { id: demoUser.id } })
  }
  console.log(`Removed ${ids.length} demo receipts.`)
}

async function add() {
  if (await prisma.receipt.count({ where: { note: { startsWith: DEMO_TAG } } })) {
    console.log('Demo data is already present. Nothing added.')
    return
  }
  const [purposes, payers, admin] = await Promise.all([
    prisma.purpose.findMany(),
    prisma.payer.findMany(),
    prisma.user.findFirst({ where: { role: 'ADMIN' }, orderBy: { createdAt: 'asc' } }),
  ])
  if (!admin || purposes.length === 0) throw new Error('Run the normal seed first (npm run setup).')

  // Demo receipts are submitted by a switched-off account with an unguessable password
  const staff = await prisma.user.upsert({
    where: { email: DEMO_EMAIL },
    update: {},
    create: {
      name: 'Demo Staff',
      email: DEMO_EMAIL,
      active: false,
      passwordHash: await bcrypt.hash(crypto.randomBytes(24).toString('hex'), 10),
    },
  })

  const today = new Date()
  let added = 0
  for (const [daysAgo, purposeName, amount, payerName, counterparty, note, status] of RECEIPTS) {
    const purpose = purposes.find((p) => p.name === purposeName)
    const payer = payerName ? payers.find((p) => p.name === payerName) : null
    if (!purpose || (payerName && !payer)) continue // a default list entry was renamed or removed

    const receiptDate = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() - daysAgo))
    const reviewed = status !== 'PENDING'
    await prisma.receipt.create({
      data: {
        amountCents: Math.round(amount * 100),
        receiptDate,
        direction: purpose.direction,
        purposeId: purpose.id,
        payerId: payer ? payer.id : null,
        paidFromAccount: purpose.direction === 'OUT' ? 'COMPANY' : null,
        counterparty,
        note: `${DEMO_TAG} ${note}`,
        status,
        submittedById: staff.id,
        reviewedById: reviewed ? admin.id : null,
        reviewedAt: reviewed ? receiptDate : null,
        createdAt: receiptDate,
        image: {
          create: { contentType: 'image/svg+xml', data: receiptImage(counterparty, receiptDate, amount, note) },
        },
      },
    })
    added += 1
  }
  console.log(`Added ${added} demo receipts.`)
}

async function main() {
  const flag = process.argv.includes('--remove') ? 'remove' : process.argv.includes('--if-enabled') ? process.env.SEED_DEMO : 'true'
  if (flag === 'remove') return remove()
  if (flag === 'true') return add()
  // --if-enabled with SEED_DEMO unset: the normal case for a hosted build
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
