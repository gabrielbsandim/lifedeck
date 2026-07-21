import { describe, expect, it } from 'vitest'
import {
  toDomainUser,
  toUserRecord,
  type UserRecord,
} from '@/database/user-record'

const RECORD: UserRecord = {
  id: 'a1c8f2e4-5b6d-4c7e-8f90-1a2b3c4d5e6f',
  displayName: 'Gabriel',
  email: 'gabriel@example.com',
  passwordHash: 'hashed',
  emailVerified: new Date('2026-06-21T12:00:00.000Z'),
  isGuest: false,
  locale: 'en',
  timezone: 'America/Sao_Paulo',
  avatarUrl: 'https://blob.example.com/avatars/x.webp',
  carryOverMode: 'manual',
  reminderEmail: false,
  reminderWhatsapp: true,
  weatherLocation: 'Mogi das Cruzes',
  assistantProfile: {
    homeLocation: 'Lisbon',
    workLocation: null,
    wakeHour: 7,
    quietHoursStart: 22,
    quietHoursEnd: 6,
    workHoursStart: 9,
    workHoursEnd: 18,
    briefEnabled: true,
    briefHour: 8,
    nudgesEnabled: true,
    people: [{ name: 'Ana', relationship: 'daughter' }],
    notes: ['prefers metric'],
  },
  createdAt: new Date('2026-06-21T10:00:00.000Z'),
}

describe('user-record mapping', () => {
  it('round-trips a record through the domain entity', () => {
    const user = toDomainUser(RECORD)
    expect(toUserRecord(user)).toEqual(RECORD)
  })

  it('maps a guest with empty optional fields', () => {
    const user = toDomainUser({
      ...RECORD,
      email: null,
      passwordHash: null,
      emailVerified: null,
      isGuest: true,
      avatarUrl: null,
    })
    const record = toUserRecord(user)
    expect(record.email).toBeNull()
    expect(record.passwordHash).toBeNull()
    expect(record.emailVerified).toBeNull()
    expect(record.isGuest).toBe(true)
    expect(record.avatarUrl).toBeNull()
  })

  it('round-trips a null weather location', () => {
    const record = toUserRecord(
      toDomainUser({ ...RECORD, weatherLocation: null }),
    )
    expect(record.weatherLocation).toBeNull()
  })

  it('round-trips a populated assistant profile', () => {
    const record = toUserRecord(toDomainUser(RECORD))
    expect(record.assistantProfile).toEqual(RECORD.assistantProfile)
  })

  it('falls back to an empty assistant profile on malformed stored JSON', () => {
    const user = toDomainUser({ ...RECORD, assistantProfile: 'not-json' })
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

  it('treats a null (legacy) assistant profile column as empty', () => {
    const user = toDomainUser({ ...RECORD, assistantProfile: null })
    expect(user.assistantProfile.notes).toEqual([])
    expect(user.assistantProfile.homeLocation).toBeNull()
  })

  it('preserves the auto carry-over mode and falls back on unknown values', () => {
    expect(
      toUserRecord(toDomainUser({ ...RECORD, carryOverMode: 'auto' }))
        .carryOverMode,
    ).toBe('auto')
    expect(
      toUserRecord(toDomainUser({ ...RECORD, carryOverMode: 'weekly' }))
        .carryOverMode,
    ).toBe('manual')
  })

  it('falls back to UTC on an unknown timezone', () => {
    expect(
      toUserRecord(toDomainUser({ ...RECORD, timezone: 'Mars/Phobos' }))
        .timezone,
    ).toBe('UTC')
    expect(
      toUserRecord(toDomainUser({ ...RECORD, timezone: 'Europe/Lisbon' }))
        .timezone,
    ).toBe('Europe/Lisbon')
  })
})
