import { describe, expect, it } from 'vitest'
import { ZodError } from 'zod'
import { User } from '@lifedeck/domain'
import { makeSetAssistantProfile } from '@/use-cases/set-assistant-profile'
import { NotFoundError } from '@/errors/use-case-error'
import { InMemoryUserRepository } from '@/testing/in-memory-user-repository'
import { ID } from '@/testing/fakes'

const NOW = new Date('2026-07-20T10:00:00.000Z')
const UNKNOWN = '00000000-0000-4000-8000-000000000000'

async function setup() {
  const users = new InMemoryUserRepository()
  await users.save(
    User.createGuest({
      id: ID.user,
      displayName: 'Gabriel',
      locale: 'en',
      createdAt: NOW,
    }),
  )
  return { users, setAssistantProfile: makeSetAssistantProfile({ users }) }
}

describe('setAssistantProfile', () => {
  it('saves the patched fields and returns the updated view', async () => {
    const ctx = await setup()
    const view = await ctx.setAssistantProfile(ID.user as string, {
      homeLocation: '  Lisbon  ',
      wakeHour: 7,
      briefEnabled: true,
      briefHour: 8,
      people: [{ name: 'Ana', relationship: 'daughter' }],
      notes: ['prefers metric'],
    })
    expect(view.assistantProfile.homeLocation).toBe('Lisbon')
    expect(view.assistantProfile.wakeHour).toBe(7)
    expect(view.assistantProfile.briefEnabled).toBe(true)
    expect(view.assistantProfile.people).toEqual([
      { name: 'Ana', relationship: 'daughter' },
    ])
    const stored = await ctx.users.findById(ID.user)
    expect(stored?.assistantProfile.homeLocation).toBe('Lisbon')
  })

  it('appends a note with addNote without touching the rest', async () => {
    const ctx = await setup()
    await ctx.setAssistantProfile(ID.user as string, { notes: ['first'] })
    const view = await ctx.setAssistantProfile(ID.user as string, {
      addNote: 'second',
    })
    expect(view.assistantProfile.notes).toEqual(['first', 'second'])
  })

  it('normalizes an omitted relationship to null', async () => {
    const ctx = await setup()
    const view = await ctx.setAssistantProfile(ID.user as string, {
      people: [{ name: 'Bob' }],
    })
    expect(view.assistantProfile.people).toEqual([
      { name: 'Bob', relationship: null },
    ])
  })

  it('rejects an out-of-range hour', async () => {
    const ctx = await setup()
    await expect(
      ctx.setAssistantProfile(ID.user as string, { wakeHour: 99 }),
    ).rejects.toBeInstanceOf(ZodError)
  })

  it('rejects an unknown user', async () => {
    const ctx = await setup()
    await expect(
      ctx.setAssistantProfile(UNKNOWN, { homeLocation: 'Rio' }),
    ).rejects.toBeInstanceOf(NotFoundError)
  })
})
