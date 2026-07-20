import { describe, expect, it } from 'vitest'
import { ZodError } from 'zod'
import { User } from '@lifedeck/domain'
import { makeSetWeatherLocation } from '@/use-cases/set-weather-location'
import { NotFoundError } from '@/errors/use-case-error'
import { InMemoryUserRepository } from '@/testing/in-memory-user-repository'
import { ID } from '@/testing/fakes'

const NOW = new Date('2026-06-21T10:00:00.000Z')
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
  return { users, setWeatherLocation: makeSetWeatherLocation({ users }) }
}

describe('setWeatherLocation', () => {
  it('saves a trimmed location and returns the user', async () => {
    const ctx = await setup()
    const view = await ctx.setWeatherLocation(ID.user as string, {
      location: '  Mogi das Cruzes  ',
    })
    expect(view.weatherLocation).toBe('Mogi das Cruzes')
    const stored = await ctx.users.findById(ID.user)
    expect(stored?.weatherLocation).toBe('Mogi das Cruzes')
  })

  it('clears the location with null', async () => {
    const ctx = await setup()
    await ctx.setWeatherLocation(ID.user as string, { location: 'Lisbon' })
    const view = await ctx.setWeatherLocation(ID.user as string, {
      location: null,
    })
    expect(view.weatherLocation).toBeNull()
  })

  it('rejects a location over the max length', async () => {
    const ctx = await setup()
    await expect(
      ctx.setWeatherLocation(ID.user as string, {
        location: 'a'.repeat(161),
      }),
    ).rejects.toBeInstanceOf(ZodError)
  })

  it('rejects an unknown user', async () => {
    const ctx = await setup()
    await expect(
      ctx.setWeatherLocation(UNKNOWN, { location: 'Rio' }),
    ).rejects.toBeInstanceOf(NotFoundError)
  })
})
