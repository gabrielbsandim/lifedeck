import { describe, expect, it } from 'vitest'
import { User, asEntityId } from '@lifedeck/domain'
import { InMemoryUserRepository } from '@/testing/in-memory-user-repository'
import { NotFoundError } from '@/errors/use-case-error'
import { makeSetReminderPreferences } from '@/use-cases/set-reminder-preferences'

const USER_ID = 'bbbbbbbb-bbbb-4bbb-9bbb-bbbbbbbbbbbb'

function guest() {
  return User.createGuest({
    id: asEntityId(USER_ID),
    displayName: 'Gabriel',
    locale: 'en',
    createdAt: new Date('2026-06-24T00:00:00.000Z'),
  })
}

describe('setReminderPreferences', () => {
  it('updates the reminder channels and returns the view', async () => {
    const users = new InMemoryUserRepository()
    await users.save(guest())
    const setReminderPreferences = makeSetReminderPreferences({ users })

    const view = await setReminderPreferences(USER_ID, {
      email: true,
      whatsapp: false,
    })

    expect(view.reminderEmail).toBe(true)
    expect(view.reminderWhatsapp).toBe(false)
  })

  it('leaves omitted channels unchanged', async () => {
    const users = new InMemoryUserRepository()
    await users.save(guest())
    const setReminderPreferences = makeSetReminderPreferences({ users })

    const view = await setReminderPreferences(USER_ID, { email: true })

    expect(view.reminderEmail).toBe(true)
    expect(view.reminderWhatsapp).toBe(true)
  })

  it('throws when the user does not exist', async () => {
    const setReminderPreferences = makeSetReminderPreferences({
      users: new InMemoryUserRepository(),
    })
    await expect(
      setReminderPreferences(USER_ID, { email: true }),
    ).rejects.toBeInstanceOf(NotFoundError)
  })
})
