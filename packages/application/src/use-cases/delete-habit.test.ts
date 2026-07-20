import { describe, expect, it } from 'vitest'
import { Habit, asEntityId } from '@lifedeck/domain'
import { makeDeleteHabit } from '@/use-cases/delete-habit'
import { NotFoundError } from '@/errors/use-case-error'
import { InMemoryHabitRepository } from '@/testing/in-memory-habit-repository'
import { ID } from '@/testing/fakes'

const NOW = new Date('2026-07-20T12:00:00.000Z')
const HABIT = asEntityId('11111111-1111-4111-8111-111111111111')

async function setup(ownerId = ID.user) {
  const habits = new InMemoryHabitRepository()
  await habits.save(
    Habit.create({
      id: HABIT,
      ownerId,
      title: 'Meditate',
      cadence: { kind: 'daily' },
      createdAt: NOW,
    }),
  )
  return { habits, deleteHabit: makeDeleteHabit({ habits }) }
}

describe('deleteHabit', () => {
  it('deletes an owned habit', async () => {
    const { habits, deleteHabit } = await setup()

    await deleteHabit(ID.user, HABIT)

    expect(await habits.findById(HABIT)).toBeNull()
  })

  it('rejects an unknown habit', async () => {
    const { deleteHabit } = await setup()
    await expect(
      deleteHabit(ID.user, asEntityId('00000000-0000-4000-8000-000000000000')),
    ).rejects.toBeInstanceOf(NotFoundError)
  })

  it('rejects a habit owned by someone else', async () => {
    const { deleteHabit } = await setup(ID.otherUser)
    await expect(deleteHabit(ID.user, HABIT)).rejects.toBeInstanceOf(
      NotFoundError,
    )
  })
})
