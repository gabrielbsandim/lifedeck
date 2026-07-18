import { PrismaClient } from '@prisma/client'
import { Pool, neonConfig } from '@neondatabase/serverless'
import { PrismaNeon } from '@prisma/adapter-neon'
import ws from 'ws'

// The Neon serverless driver tunnels Postgres over a WebSocket. Node has no
// global WebSocket the driver can use, so provide one. This transport resumes a
// scaled-to-zero Neon compute reliably on cold start, unlike a raw TCP
// connection to the pooler (which fails with "Can't reach database server"
// when the compute has autosuspended).
neonConfig.webSocketConstructor = ws

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createPrismaClient(): PrismaClient {
  const log: ('error' | 'warn')[] =
    process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error']
  const pool = new Pool({ connectionString: process.env.DATABASE_URL })
  const adapter = new PrismaNeon(pool)
  return new PrismaClient({ adapter, log })
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}
