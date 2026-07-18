import { PrismaClient } from '@prisma/client'
import { retryOnTransientConnection } from '@/database/connection-retry'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createPrismaClient(): PrismaClient {
  const log: ('error' | 'warn')[] =
    process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error']
  // Retry every query on a transient connection error so a query that hits a
  // stale pooled connection (Neon closes them on scale-to-zero) reconnects and
  // succeeds instead of surfacing "Error in PostgreSQL connection: Closed".
  // Applies to raw queries too; connection errors happen on the first query of
  // a request, before any interactive transaction, so this never retries
  // mid-transaction.
  const client = new PrismaClient({ log }).$extends({
    query: {
      $allOperations: ({ args, query }) =>
        retryOnTransientConnection(() => query(args)),
    },
  })
  return client as unknown as PrismaClient
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}
