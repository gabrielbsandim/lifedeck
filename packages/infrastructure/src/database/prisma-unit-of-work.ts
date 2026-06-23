import { AsyncLocalStorage } from 'node:async_hooks'
import type { PrismaClient } from '@prisma/client'
import type { UnitOfWork } from '@lifedeck/application'

const storage = new AsyncLocalStorage<PrismaClient>()

/**
 * Wraps a PrismaClient so every model access is routed to the transaction
 * client bound to the current async context (set by PrismaUnitOfWork.run),
 * falling back to the root client when no transaction is active. Repositories
 * receive this proxy and need no awareness of transactions.
 */
export function createTransactionalClient(root: PrismaClient): PrismaClient {
  return new Proxy(root, {
    get(target, property, receiver) {
      const active = storage.getStore() ?? target
      return Reflect.get(
        active,
        property,
        active === target ? receiver : active,
      )
    },
  })
}

export class PrismaUnitOfWork implements UnitOfWork {
  constructor(private readonly root: PrismaClient) {}

  run<T>(work: () => Promise<T>): Promise<T> {
    // Reentrant: a run nested inside an active transaction joins it (no nested
    // savepoint), so an error inside the inner run rolls back the whole tx.
    if (storage.getStore()) {
      return work()
    }
    return this.root.$transaction(tx =>
      storage.run(tx as unknown as PrismaClient, work),
    )
  }
}
