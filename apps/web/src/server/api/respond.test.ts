import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { ValidationError } from '@lifedeck/domain'
import { ForbiddenError, NotFoundError } from '@lifedeck/application'
import { fail, handleError, ok, okPage } from '@/server/api/respond'

describe('respond helpers', () => {
  it('wraps data with the given status', async () => {
    const response = ok({ id: 1 }, 201)
    expect(response.status).toBe(201)
    await expect(response.json()).resolves.toEqual({ data: { id: 1 } })
  })

  it('wraps a page with its items and next cursor', async () => {
    const response = okPage({ items: [{ id: 1 }], nextCursor: 'abc' })
    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      data: [{ id: 1 }],
      nextCursor: 'abc',
    })
  })

  it('exposes a null next cursor on the final page', async () => {
    const response = okPage({ items: [], nextCursor: null })
    await expect(response.json()).resolves.toEqual({
      data: [],
      nextCursor: null,
    })
  })

  it('builds an error envelope', async () => {
    const response = fail('CODE', 'message', 400, { field: 'x' })
    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({
      error: { code: 'CODE', message: 'message', details: { field: 'x' } },
    })
  })

  it('maps a ZodError to 422', async () => {
    const error = z.object({ a: z.string() }).safeParse({}).error
    const response = handleError(error)
    expect(response.status).toBe(422)
    await expect(response.json()).resolves.toMatchObject({
      error: { code: 'VALIDATION_ERROR' },
    })
  })

  it('maps a domain ValidationError to 422', () => {
    expect(handleError(new ValidationError('bad')).status).toBe(422)
  })

  it('maps a NotFoundError to 404', () => {
    expect(handleError(new NotFoundError('Task')).status).toBe(404)
  })

  it('maps a ForbiddenError to 403', () => {
    expect(handleError(new ForbiddenError('task')).status).toBe(403)
  })

  it('maps an unknown error to 500', () => {
    expect(handleError(new Error('boom')).status).toBe(500)
  })
})
