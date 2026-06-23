import { describe, expect, it } from 'vitest'
import { RecurringTask } from '@lifedeck/domain'
import { InMemoryRecurringTaskRepository } from '@/testing/in-memory-recurring-task-repository'
import { ID } from '@/testing/fakes'

function makeDefinition(id = ID.task, ownerId = ID.user) {
  return RecurringTask.create({
    id,
    ownerId,
    title: 'Drink water',
    rule: { freq: 'daily', interval: 1, startDate: '2026-06-21' },
    createdAt: new Date('2026-06-21T10:00:00.000Z'),
  })
}

describe('InMemoryRecurringTaskRepository', () => {
  it('saves and finds a definition by id', async () => {
    const repo = new InMemoryRecurringTaskRepository()
    await repo.save(makeDefinition())

    expect(await repo.findById(ID.task)).not.toBeNull()
    expect(await repo.findById(ID.list)).toBeNull()
  })

  it('lists definitions by owner', async () => {
    const repo = new InMemoryRecurringTaskRepository()
    await repo.save(makeDefinition(ID.task, ID.user))
    await repo.save(makeDefinition(ID.list, ID.otherUser))

    const owned = await repo.listByOwner(ID.user)
    expect(owned).toHaveLength(1)
    expect(owned[0]?.ownerId).toBe(ID.user)
  })
})
