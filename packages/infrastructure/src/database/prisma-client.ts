import { Pool } from '@neondatabase/serverless'
import { PrismaNeon } from '@prisma/adapter-neon'
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createPrismaClient(): PrismaClient {
  const url = process.env.DATABASE_URL ?? ''
  const log: ('error' | 'warn')[] =
    process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error']
  if (url.includes('neon.tech')) {
    const pool = new Pool({ connectionString: url })
    return new PrismaClient({ adapter: new PrismaNeon(pool), log })
  }
  return new PrismaClient({ log })
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}
