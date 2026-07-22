import { describe, expect, it } from 'vitest'
import { User } from '@/entities/user'
import { asEntityId } from '@/shared/id'
import { ValidationError } from '@/shared/domain-error'

const ID = asEntityId('3f2504e0-4f89-41d3-9a0c-0305e82c3301')
const CREATED_AT = new Date('2026-06-21T10:00:00.000Z')

function createGuest(displayName = 'Gabriel', locale = 'en') {
  return User.createGuest({
    id: ID,
    displayName,
    locale,
    createdAt: CREATED_AT,
  })
}

describe('User', () => {
  it('creates a guest with sensible defaults', () => {
    const user = createGuest('  Gabriel  ')

    expect(user.id).toBe(ID)
    expect(user.displayName).toBe('Gabriel')
    expect(user.isGuest).toBe(true)
    expect(user.locale).toBe('en')
    expect(user.toJSON()).toMatchObject({
      email: null,
      passwordHash: null,
      emailVerifiedAt: null,
      createdAt: CREATED_AT,
    })
  })

  it('rejects an empty display name', () => {
    expect(() => createGuest('   ')).toThrow(ValidationError)
  })

  it('rejects a display name longer than 80 characters', () => {
    expect(() => createGuest('a'.repeat(81))).toThrow(ValidationError)
  })

  it('rejects an empty locale', () => {
    expect(() => createGuest('Gabriel', ' ')).toThrow(ValidationError)
  })

  it('renames with validation', () => {
    const user = createGuest()
    user.rename('  Noiva  ')
    expect(user.displayName).toBe('Noiva')
    expect(() => user.rename('')).toThrow(ValidationError)
  })

  it('restores from persisted props', () => {
    const props = createGuest().toJSON()
    expect(User.restore(props).toJSON()).toEqual(props)
  })

  it('defaults to the UTC timezone and updates it with validation', () => {
    const user = createGuest()
    expect(user.timezone).toBe('UTC')
    user.setTimezone('America/Sao_Paulo')
    expect(user.timezone).toBe('America/Sao_Paulo')
    expect(() => user.setTimezone('Mars/Phobos')).toThrow(ValidationError)
  })

  it('accepts an explicit timezone at creation', () => {
    const user = User.createGuest({
      id: ID,
      displayName: 'Gabriel',
      locale: 'en',
      timezone: 'Europe/Lisbon',
      createdAt: CREATED_AT,
    })
    expect(user.timezone).toBe('Europe/Lisbon')
  })

  it('has no avatar by default and sets/removes one with validation', () => {
    const user = createGuest()
    expect(user.avatarUrl).toBeNull()
    user.setAvatar('https://blob.example.com/avatars/abc.webp')
    expect(user.avatarUrl).toBe('https://blob.example.com/avatars/abc.webp')
    expect(() => user.setAvatar('http://insecure.example.com/a.png')).toThrow(
      ValidationError,
    )
    expect(() => user.setAvatar('javascript:alert(1)')).toThrow(ValidationError)
    user.removeAvatar()
    expect(user.avatarUrl).toBeNull()
  })

  it('accepts an initial avatar at creation', () => {
    const user = User.createGuest({
      id: ID,
      displayName: 'Gabriel',
      locale: 'en',
      avatarUrl: 'https://lh3.googleusercontent.com/a/pic',
      createdAt: CREATED_AT,
    })
    expect(user.avatarUrl).toBe('https://lh3.googleusercontent.com/a/pic')
  })

  it('defaults to manual carry-over and updates it with validation', () => {
    const user = createGuest()
    expect(user.carryOverMode).toBe('manual')
    user.setCarryOverMode('auto')
    expect(user.carryOverMode).toBe('auto')
    expect(() => user.setCarryOverMode('weekly')).toThrow(ValidationError)
  })

  it('defaults reminder channels and updates only the ones given', () => {
    const user = createGuest()
    expect(user.reminderEmail).toBe(false)
    expect(user.reminderWhatsapp).toBe(true)

    user.setReminderChannels({ email: true })
    expect(user.reminderEmail).toBe(true)
    expect(user.reminderWhatsapp).toBe(true)

    user.setReminderChannels({ whatsapp: false })
    expect(user.reminderEmail).toBe(true)
    expect(user.reminderWhatsapp).toBe(false)

    user.setReminderChannels({})
    expect(user.reminderEmail).toBe(true)
    expect(user.reminderWhatsapp).toBe(false)
  })

  it('registers a guest with email and password, normalizing the address', () => {
    const user = createGuest()
    user.register({
      email: '  Gabriel@Example.COM ',
      passwordHash: 'hashed',
      emailVerifiedAt: null,
    })

    expect(user.email).toBe('gabriel@example.com')
    expect(user.passwordHash).toBe('hashed')
    expect(user.isGuest).toBe(false)
    expect(user.isEmailVerified).toBe(false)
  })

  it('registers without a password (OAuth) and trusts the verified email', () => {
    const user = createGuest()
    const verifiedAt = new Date('2026-06-22T08:00:00.000Z')
    user.register({
      email: 'gabriel@example.com',
      passwordHash: null,
      emailVerifiedAt: verifiedAt,
    })

    expect(user.passwordHash).toBeNull()
    expect(user.isEmailVerified).toBe(true)
    expect(user.emailVerifiedAt).toEqual(verifiedAt)
  })

  it('rejects registering with an invalid email', () => {
    const user = createGuest()
    expect(() =>
      user.register({
        email: 'not-an-email',
        passwordHash: 'hashed',
        emailVerifiedAt: null,
      }),
    ).toThrow(ValidationError)
  })

  it('marks the email verified at a given time', () => {
    const user = createGuest()
    user.register({
      email: 'gabriel@example.com',
      passwordHash: 'hashed',
      emailVerifiedAt: null,
    })
    const at = new Date('2026-06-22T09:00:00.000Z')
    user.verifyEmail(at)

    expect(user.isEmailVerified).toBe(true)
    expect(user.emailVerifiedAt).toEqual(at)
  })

  it('changes the password hash with validation', () => {
    const user = createGuest()
    user.changePassword('new-hash')
    expect(user.passwordHash).toBe('new-hash')
    expect(() => user.changePassword('')).toThrow(ValidationError)
  })

  it('starts with an empty assistant profile', () => {
    const user = createGuest()
    expect(user.assistantProfile).toEqual({
      homeLocation: null,
      workLocation: null,
      wakeHour: null,
      quietHoursStart: null,
      quietHoursEnd: null,
      workHoursStart: null,
      workHoursEnd: null,
      briefEnabled: false,
      briefHour: null,
      nudgesEnabled: true,
      people: [],
      notes: [],
    })
  })

  it('updates the assistant profile through a validated patch', () => {
    const user = createGuest()
    user.updateProfile({ homeLocation: '  Lisbon  ', briefEnabled: true })
    expect(user.assistantProfile.homeLocation).toBe('Lisbon')
    expect(user.assistantProfile.briefEnabled).toBe(true)
    expect(() => user.updateProfile({ wakeHour: 99 })).toThrow(ValidationError)
  })

  it('remembers and forgets notes', () => {
    const user = createGuest()
    user.rememberNote('  prefers metric  ')
    user.rememberNote('no early meetings')
    expect(user.assistantProfile.notes).toEqual([
      'prefers metric',
      'no early meetings',
    ])
    user.forgetNote(0)
    expect(user.assistantProfile.notes).toEqual(['no early meetings'])
  })
})
