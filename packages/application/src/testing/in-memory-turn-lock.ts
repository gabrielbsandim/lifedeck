import type { ReleaseTurnLock, TurnLock } from '@/ports/turn-lock'

// Queues turns per user in process: each acquire waits for the previous holder.
export class InMemoryTurnLock implements TurnLock {
  private readonly tails = new Map<string, Promise<void>>()

  async acquire(userId: string): Promise<ReleaseTurnLock> {
    const previous = this.tails.get(userId) ?? Promise.resolve()
    let release: () => void = () => {}
    const held = new Promise<void>(resolve => {
      release = resolve
    })
    const tail = previous.then(() => held)
    this.tails.set(userId, tail)
    await previous
    return async () => {
      release()
      if (this.tails.get(userId) === tail) {
        this.tails.delete(userId)
      }
    }
  }
}
