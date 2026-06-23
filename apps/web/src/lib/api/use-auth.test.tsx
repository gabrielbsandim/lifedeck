import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderHook } from '@testing-library/react'
import {
  useRegister,
  useResendCode,
  useSignIn,
  useVerifyEmail,
} from '@/lib/api/use-auth'
import { createWrapper, mockFetchOnce } from '@/lib/api/test-utils'

const USER = {
  id: 'a1c8f2e4-5b6d-4c7e-8f90-1a2b3c4d5e6f',
  displayName: 'Gabriel',
  email: 'gab@example.com',
  isGuest: false,
  isEmailVerified: false,
  hasPassword: true,
  locale: 'en',
  createdAt: '2026-06-22T10:00:00.000Z',
}

describe('auth hooks', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('registers via POST', async () => {
    const fetchMock = mockFetchOnce({ data: USER })
    const { Wrapper } = createWrapper()
    const { result } = renderHook(() => useRegister(), { wrapper: Wrapper })
    await result.current.mutateAsync({
      email: 'gab@example.com',
      password: 'supersecret',
    })
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/auth/register',
      expect.objectContaining({ method: 'POST' }),
    )
  })

  it('verifies the email via POST', async () => {
    const fetchMock = mockFetchOnce({
      data: { ...USER, isEmailVerified: true },
    })
    const { Wrapper } = createWrapper()
    const { result } = renderHook(() => useVerifyEmail(), { wrapper: Wrapper })
    await result.current.mutateAsync({ code: '123456' })
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/auth/verify',
      expect.objectContaining({ method: 'POST' }),
    )
  })

  it('resends the verification code via POST', async () => {
    const fetchMock = mockFetchOnce({ data: USER })
    const { Wrapper } = createWrapper()
    const { result } = renderHook(() => useResendCode(), { wrapper: Wrapper })
    await result.current.mutateAsync()
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/auth/resend-code',
      expect.objectContaining({ method: 'POST' }),
    )
  })

  it('signs in via POST', async () => {
    const fetchMock = mockFetchOnce({
      data: { ...USER, isEmailVerified: true },
    })
    const { Wrapper } = createWrapper()
    const { result } = renderHook(() => useSignIn(), { wrapper: Wrapper })
    await result.current.mutateAsync({
      email: 'gab@example.com',
      password: 'supersecret',
    })
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/auth/sign-in',
      expect.objectContaining({ method: 'POST' }),
    )
  })
})
