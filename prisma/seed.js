const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')
const fs = require('fs')
const path = require('path')

// Load .env ourselves so the SEED_* values are available on Node 18
const envFile = path.join(__dirname, '..', '.env')
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*"?(.*?)"?\s*$/)
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2]
  }
}

const prisma = new PrismaClient()

const purposes = [
  ['Sale', 'IN'],
  ['Other income', 'IN'],
  ['Buy item', 'OUT'],
  ['Rent', 'OUT'],
  ['Utilities', 'OUT'],
  ['Transport', 'OUT'],
  ['Salary', 'OUT'],
  ['Other expense', 'OUT'],
]

const payers = ['Staff', 'Admin', 'Finance']

async function seedUser(name, email, password, role) {
  if (!email || !password) return
  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) return
  await prisma.user.create({
    data: { name, email, passwordHash: await bcrypt.hash(password, 10), role },
  })
  console.log(`Created ${role} account ${email}`)
}

async function main() {
  for (const [name, direction] of purposes) {
    await prisma.purpose.upsert({ where: { name }, update: {}, create: { name, direction } })
  }
  for (const name of payers) {
    await prisma.payer.upsert({ where: { name }, update: {}, create: { name } })
  }
  await seedUser('Admin', process.env.SEED_ADMIN_EMAIL, process.env.SEED_ADMIN_PASSWORD, 'ADMIN')
  await seedUser('Staff', process.env.SEED_STAFF_EMAIL, process.env.SEED_STAFF_PASSWORD, 'USER')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
