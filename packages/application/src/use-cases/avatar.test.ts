import { describe, expect, it } from 'vitest'
import { User, ValidationError } from '@lifedeck/domain'
import { makeSetAvatar } from '@/use-cases/set-avatar'
import { makeRemoveAvatar } from '@/use-cases/remove-avatar'
import { NotFoundError } from '@/errors/use-case-error'
import { InMemoryUserRepository } from '@/testing/in-memory-user-repository'
import { FakeFileStorage } from '@/testing/fake-file-storage'
import { ID } from '@/testing/fakes'

const NOW = new Date('2026-06-21T10:00:00.000Z')
const UNKNOWN = '00000000-0000-4000-8000-000000000000'
const PNG = new Uint8Array([1, 2, 3, 4])

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
  const fileStorage = new FakeFileStorage()
  return {
    users,
    fileStorage,
    setAvatar: makeSetAvatar({ users, fileStorage }),
    removeAvatar: makeRemoveAvatar({ users, fileStorage }),
  }
}

describe('setAvatar', () => {
  it('uploads the image and stores its url on the user', async () => {
    const ctx = await setup()
    const view = await ctx.setAvatar(ID.user as string, {
      data: PNG,
      contentType: 'image/png',
    })
    expect(view.avatarUrl).toMatch(/^https:\/\/blob\.test\/avatars\//)
    expect(ctx.fileStorage.uploaded).toHaveLength(1)
    const stored = await ctx.users.findById(ID.user)
    expect(stored?.avatarUrl).toBe(view.avatarUrl)
  })

  it('removes the previous blob when replacing the avatar', async () => {
    const ctx = await setup()
    const first = await ctx.setAvatar(ID.user as string, {
      data: PNG,
      contentType: 'image/png',
    })
    await ctx.setAvatar(ID.user as string, {
      data: PNG,
      contentType: 'image/webp',
    })
    expect(ctx.fileStorage.removed).toContain(first.avatarUrl)
  })

  it('rejects an unsupported content type', async () => {
    const ctx = await setup()
    await expect(
      ctx.setAvatar(ID.user as string, {
        data: PNG,
        contentType: 'image/gif',
      }),
    ).rejects.toBeInstanceOf(ValidationError)
  })

  it('rejects an empty or oversized image', async () => {
    const ctx = await setup()
    await expect(
      ctx.setAvatar(ID.user as string, {
        data: new Uint8Array(0),
        contentType: 'image/png',
      }),
    ).rejects.toBeInstanceOf(ValidationError)
    await expect(
      ctx.setAvatar(ID.user as string, {
        data: new Uint8Array(512 * 1024 + 1),
        contentType: 'image/png',
      }),
    ).rejects.toBeInstanceOf(ValidationError)
  })

  it('rejects an unknown user', async () => {
    const ctx = await setup()
    await expect(
      ctx.setAvatar(UNKNOWN, { data: PNG, contentType: 'image/png' }),
    ).rejects.toBeInstanceOf(NotFoundError)
  })
})

describe('removeAvatar', () => {
  it('clears the avatar and deletes the blob', async () => {
    const ctx = await setup()
    const set = await ctx.setAvatar(ID.user as string, {
      data: PNG,
      contentType: 'image/png',
    })
    const view = await ctx.removeAvatar(ID.user as string)
    expect(view.avatarUrl).toBeNull()
    expect(ctx.fileStorage.removed).toContain(set.avatarUrl)
    const stored = await ctx.users.findById(ID.user)
    expect(stored?.avatarUrl).toBeNull()
  })

  it('is a no-op blob-wise when there is no avatar', async () => {
    const ctx = await setup()
    const view = await ctx.removeAvatar(ID.user as string)
    expect(view.avatarUrl).toBeNull()
    expect(ctx.fileStorage.removed).toHaveLength(0)
  })

  it('rejects an unknown user', async () => {
    const ctx = await setup()
    await expect(ctx.removeAvatar(UNKNOWN)).rejects.toBeInstanceOf(
      NotFoundError,
    )
  })
})
