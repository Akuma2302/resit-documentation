import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

// On Netlify the database URL comes from Netlify DB unless DATABASE_URL is set by hand
const datasourceUrl = process.env.DATABASE_URL || process.env.NETLIFY_DATABASE_URL

export const db = globalForPrisma.prisma ?? new PrismaClient({ datasourceUrl })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
