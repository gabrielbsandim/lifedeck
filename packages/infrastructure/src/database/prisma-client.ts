import { PrismaClient } from '@prisma/client'
import { Pool, neonConfig } from '@neondatabase/serverless'
import { PrismaNeon } from '@prisma/adapter-neon'
import ws from 'ws'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

/**
 * The Neon serverless driver tunnels Postgres over a WebSocket and only speaks
 * to a Neon endpoint. It resumes a scaled-to-zero Neon compute reliably on cold
 * start, unlike a raw TCP connection to the pooler (which fails with "Can't
 * reach database server" once the compute has autosuspended). It cannot talk to
 * a plain Postgres, so use it only for Neon URLs; local dev and CI (a standard
 * postgres container) fall back to the default TCP client.
 */
function isNeonUrl(url: string | undefined): url is string {
  return !!url && url.includes('neon.tech')
}

function createPrismaClient(): PrismaClient {
  const log: ('error' | 'warn')[] =
    process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error']

  const connectionString = process.env.DATABASE_URL
  if (isNeonUrl(connectionString)) {
    neonConfig.webSocketConstructor = ws
    const pool = new Pool({ connectionString })
    const adapter = new PrismaNeon(pool)
    return new PrismaClient({ adapter, log })
  }

  return new PrismaClient({ log })
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}
