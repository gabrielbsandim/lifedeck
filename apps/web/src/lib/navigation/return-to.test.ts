import { describe, expect, it } from 'vitest'
import {
  returnToFrom,
  safeReturnTo,
  signInPath,
} from '@/lib/navigation/return-to'

describe('safeReturnTo', () => {
  it.each([
    ['/habits', '/habits'],
    ['/lists/abc?tab=done', '/lists/abc?tab=done'],
  ])('keeps the same-origin path %s', (value, expected) => {
    expect(safeReturnTo(value)).toBe(expected)
  })

  it.each([
    null,
    undefined,
    '',
    'https://evil.test',
    '//evil.test',
    '/\\evil.test',
    'habits',
  ])('rejects %s', value => {
    expect(safeReturnTo(value)).toBeNull()
  })
})

describe('signInPath', () => {
  it('carries the destination to the sign-in screen', () => {
    expect(signInPath('/habits?view=week')).toBe(
      '/?returnTo=%2Fhabits%3Fview%3Dweek',
    )
  })

  it('goes straight home when there is nowhere to return to', () => {
    expect(signInPath('/')).toBe('/')
    expect(signInPath('//evil.test')).toBe('/')
  })
})

describe('returnToFrom', () => {
  it('reads a safe destination back from the query string', () => {
    expect(returnToFrom('?returnTo=%2Fcalendar')).toBe('/calendar')
  })

  it('ignores a missing, home or unsafe destination', () => {
    expect(returnToFrom('')).toBeNull()
    expect(returnToFrom('?returnTo=%2F')).toBeNull()
    expect(returnToFrom('?returnTo=https%3A%2F%2Fevil.test')).toBeNull()
  })
})
