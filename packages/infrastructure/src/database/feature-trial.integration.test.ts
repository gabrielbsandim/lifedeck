import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { PrismaClient } from '@prisma/client'
import { User, asEntityId } from '@lifedeck/domain'
import { PrismaFeatureTrialRepository } from '@/database/prisma-feature-trial-repository'
import { PrismaUserRepository } from '@/database/prisma-user-repository'

const prisma = new PrismaClient()
const rival = new PrismaClient()
const USER = asEntityId('3d000000-0000-4000-8000-000000000001')
const NOW = new Date('2026-06-21T12:00:00.000Z')
const trial = {
  entitlement: 'booking' as const,
  startedAt: NOW,
  endsAt: new Date('2026-07-05T12:00:00.000Z'),
}

beforeAll(async () => {
  await prisma.user.deleteMany({ where: { id: USER } })
  await new PrismaUserRepository(prisma).save(
    User.createGuest({
      id: USER,
      displayName: 'Trial user',
      locale: 'en',
      createdAt: NOW,
    }),
  )
})

afterAll(async () => {
  await prisma.user.deleteMany({ where: { id: USER } })
  await prisma.$disconnect()
  await rival.$disconnect()
})

describe('PrismaFeatureTrialRepository', () => {
  it('starts one trial per entitlement even when two taps race', async () => {
    const results = await Promise.all([
      new PrismaFeatureTrialRepository(prisma).start(USER, trial),
      new PrismaFeatureTrialRepository(rival).start(USER, trial),
    ])
    expect(results.filter(Boolean)).toHaveLength(1)
    expect(
      await new PrismaFeatureTrialRepository(prisma).listByUser(USER),
    ).toEqual([trial])
  })

  it('skips rows naming an entitlement that no longer exists', async () => {
    await prisma.featureTrial.create({
      data: {
        userId: USER,
        entitlement: 'retired',
        startedAt: NOW,
        endsAt: NOW,
      },
    })
    const trials = await new PrismaFeatureTrialRepository(prisma).listByUser(
      USER,
    )
    expect(trials.map(item => item.entitlement)).toEqual(['booking'])
  })

  it('goes away with the user', async () => {
    await prisma.user.delete({ where: { id: USER } })
    expect(await prisma.featureTrial.count({ where: { userId: USER } })).toBe(0)
  })
})
