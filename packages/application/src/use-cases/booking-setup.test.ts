import { describe, expect, it } from 'vitest'
import { BookingPage, ValidationError } from '@lifedeck/domain'
import { NotFoundError } from '@/errors/use-case-error'
import {
  BOOKING_NOW,
  OWNER,
  PAGE_ID,
  SERVICE_ID,
  STRANGER,
  bookingFixture,
} from '@/testing/booking-fixture'
import { makeArchiveBookingService } from '@/use-cases/archive-booking-service'
import { makeCheckBookingSlug } from '@/use-cases/check-booking-slug'
import { makeCreateBookingService } from '@/use-cases/create-booking-service'
import { makeDeleteAvailabilityOverride } from '@/use-cases/delete-availability-override'
import { makeGetBookingSetup } from '@/use-cases/get-booking-setup'
import { makeReorderBookingServices } from '@/use-cases/reorder-booking-services'
import { makeSetAvailability } from '@/use-cases/set-availability'
import { makeSetAvailabilityOverride } from '@/use-cases/set-availability-override'
import { makeUpdateBookingService } from '@/use-cases/update-booking-service'
import { makeUpsertBookingPage } from '@/use-cases/upsert-booking-page'

const SERVICE_INPUT = {
  name: 'Trial class',
  durationMin: 30,
  location: { kind: 'online-meet' },
}

function setup() {
  const fx = bookingFixture()
  return {
    fx,
    getSetup: makeGetBookingSetup(fx),
    upsertPage: makeUpsertBookingPage(fx),
    checkSlug: makeCheckBookingSlug(fx),
    createService: makeCreateBookingService(fx),
    updateService: makeUpdateBookingService(fx),
    archiveService: makeArchiveBookingService(fx),
    reorder: makeReorderBookingServices(fx),
    setAvailability: makeSetAvailability(fx),
    setOverride: makeSetAvailabilityOverride(fx),
    deleteOverride: makeDeleteAvailabilityOverride(fx),
  }
}

describe('booking page', () => {
  it('reports an empty setup before the page exists', async () => {
    const { getSetup } = setup()
    expect(await getSetup(OWNER)).toEqual({
      page: null,
      services: [],
      weekly: [],
      overrides: [],
    })
  })

  it('creates the page from the user, then edits it in place', async () => {
    const { fx, upsertPage, getSetup } = setup()
    await fx.seedOwner()
    const created = await upsertPage(OWNER, {
      slug: ' Ana ',
      cancelNoticeMin: 60,
      active: false,
    })
    expect(created).toMatchObject({
      slug: 'ana',
      displayName: 'Ana Lima',
      timezone: 'UTC',
      locale: 'pt',
      cancelNoticeMin: 60,
      active: false,
    })
    const edited = await upsertPage(OWNER, {
      slug: 'ana-lima',
      headline: 'English classes',
      active: true,
    })
    expect(edited).toMatchObject({
      id: created.id,
      slug: 'ana-lima',
      headline: 'English classes',
      active: true,
    })
    expect((await getSetup(OWNER)).page?.slug).toBe('ana-lima')
  })

  it('creates an active page when nothing says otherwise', async () => {
    const { fx, upsertPage } = setup()
    await fx.seedOwner()
    expect((await upsertPage(OWNER, { slug: 'ana' })).active).toBe(true)
  })

  it('refuses a slug another host holds, and needs a user', async () => {
    const { fx, upsertPage } = setup()
    await fx.pages.save(
      BookingPage.create({
        id: PAGE_ID,
        ownerId: STRANGER,
        slug: 'ana',
        displayName: 'Other Ana',
        timezone: 'UTC',
        locale: 'en',
        now: BOOKING_NOW,
      }),
    )
    await expect(upsertPage(OWNER, { slug: 'ana' })).rejects.toThrow(
      'already taken',
    )
    await expect(upsertPage(OWNER, { slug: 'bia' })).rejects.toBeInstanceOf(
      NotFoundError,
    )
  })

  it('tells whether a slug is free, taken, reserved or invalid', async () => {
    const { fx, checkSlug } = setup()
    await fx.seedPage()
    expect(await checkSlug(OWNER, 'Ana')).toEqual({
      slug: 'ana',
      available: true,
      reason: null,
    })
    expect(await checkSlug(STRANGER, 'ana')).toMatchObject({
      available: false,
      reason: 'taken',
    })
    expect(await checkSlug(OWNER, 'admin')).toMatchObject({
      reason: 'reserved',
    })
    expect(await checkSlug(OWNER, 'a_b')).toMatchObject({ reason: 'invalid' })
  })
})

describe('booking services', () => {
  it('appends a service after the existing ones', async () => {
    const { fx, createService, getSetup } = setup()
    await fx.seedPage()
    const created = await createService(OWNER, SERVICE_INPUT)
    expect(created).toMatchObject({
      name: 'Trial class',
      position: 1,
      location: { kind: 'online-meet' },
      requiresApproval: false,
    })
    const names = (await getSetup(OWNER)).services.map(service => service.name)
    expect(names).toEqual(['Aula', 'Trial class'])
  })

  it('needs a page first', async () => {
    const { createService } = setup()
    await expect(createService(OWNER, SERVICE_INPUT)).rejects.toThrow(
      'Booking page was not found',
    )
  })

  it('updates and archives only the owner’s service', async () => {
    const { fx, updateService, archiveService } = setup()
    await fx.seedPage()
    const updated = await updateService(OWNER, SERVICE_ID, {
      ...SERVICE_INPUT,
      requiresApproval: true,
      maxPerDay: 2,
    })
    expect(updated).toMatchObject({ requiresApproval: true, maxPerDay: 2 })
    expect((await archiveService(OWNER, SERVICE_ID)).active).toBe(false)
    await expect(archiveService(STRANGER, SERVICE_ID)).rejects.toBeInstanceOf(
      NotFoundError,
    )
  })

  it('reorders by the full list of ids', async () => {
    const { fx, createService, reorder } = setup()
    await fx.seedPage()
    const second = await createService(OWNER, SERVICE_INPUT)
    const ordered = await reorder(OWNER, { ids: [second.id, SERVICE_ID] })
    expect(ordered.map(service => [service.id, service.position])).toEqual([
      [second.id, 0],
      [SERVICE_ID, 1],
    ])
    await expect(reorder(OWNER, { ids: [second.id] })).rejects.toBeInstanceOf(
      ValidationError,
    )
    await expect(
      reorder(OWNER, { ids: [second.id, second.id] }),
    ).rejects.toThrow('exactly once')
  })
})

describe('availability', () => {
  it('replaces the weekly hours, sorted and validated', async () => {
    const { fx, setAvailability, getSetup } = setup()
    await fx.seedPage()
    const weekly = await setAvailability(OWNER, {
      weekly: [
        { weekday: 3, startMinute: 600, endMinute: 660 },
        { weekday: 2, startMinute: 540, endMinute: 600 },
      ],
    })
    expect(weekly.map(window => window.weekday)).toEqual([2, 3])
    expect((await getSetup(OWNER)).weekly).toEqual(weekly)
    await expect(
      setAvailability(OWNER, {
        weekly: [{ weekday: 1, startMinute: 600, endMinute: 540 }],
      }),
    ).rejects.toBeInstanceOf(ValidationError)
  })

  it('sets, lists and removes a date override', async () => {
    const { fx, setOverride, deleteOverride, getSetup } = setup()
    await fx.seedPage()
    await setOverride(OWNER, { date: '2026-06-22', windows: [] })
    await setOverride(OWNER, {
      date: '2026-06-23',
      windows: [{ startMinute: 480, endMinute: 540 }],
    })
    expect((await getSetup(OWNER)).overrides).toEqual([
      { date: '2026-06-22', windows: [] },
      { date: '2026-06-23', windows: [{ startMinute: 480, endMinute: 540 }] },
    ])
    await deleteOverride(OWNER, '2026-06-22')
    expect((await getSetup(OWNER)).overrides).toHaveLength(1)
    await expect(deleteOverride(OWNER, '22/06/2026')).rejects.toThrow(
      'YYYY-MM-DD',
    )
  })
})
