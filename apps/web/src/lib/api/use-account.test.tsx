import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderHook } from '@testing-library/react'
import {
  useChangePassword,
  useDeleteAccount,
  useRenameUser,
  useSetCarryOverMode,
  useSignOut,
} from '@/lib/api/use-account'
import { createWrapper, mockFetchOnce } from '@/lib/api/test-utils'

const USER = {
  id: 'a1c8f2e4-5b6d-4c7e-8f90-1a2b3c4d5e6f',
  displayName: 'Noiva',
  email: 'gab@example.com',
  isGuest: false,
  isEmailVerified: true,
  hasPassword: true,
  locale: 'en',
  createdAt: '2026-06-22T10:00:00.000Z',
}

describe('account hooks', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('renames via PATCH', async () => {
    const fetchMock = mockFetchOnce({ data: USER })
    const { Wrapper } = createWrapper()
    const { result } = renderHook(() => useRenameUser(), { wrapper: Wrapper })
    await result.current.mutateAsync({ displayName: 'Noiva' })
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/account',
      expect.objectContaining({ method: 'PATCH' }),
    )
  })

  it('sets the carry-over mode via PATCH', async () => {
    const fetchMock = mockFetchOnce({
      data: { ...USER, carryOverMode: 'auto' },
    })
    const { Wrapper } = createWrapper()
    const { result } = renderHook(() => useSetCarryOverMode(), {
      wrapper: Wrapper,
    })
    await result.current.mutateAsync('auto')
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/account/carry-over',
      expect.objectContaining({ method: 'PATCH' }),
    )
  })

  it('changes the password via PATCH', async () => {
    const fetchMock = mockFetchOnce({ data: USER })
    const { Wrapper } = createWrapper()
    const { result } = renderHook(() => useChangePassword(), {
      wrapper: Wrapper,
    })
    await result.current.mutateAsync({
      currentPassword: 'oldpassword',
      newPassword: 'brandnewpass',
    })
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/account/password',
      expect.objectContaining({ method: 'PATCH' }),
    )
  })

  it('signs out via DELETE', async () => {
    const fetchMock = mockFetchOnce({ data: { signedOut: true } })
    const { Wrapper } = createWrapper()
    const { result } = renderHook(() => useSignOut(), { wrapper: Wrapper })
    await result.current.mutateAsync()
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/sessions',
      expect.objectContaining({ method: 'DELETE' }),
    )
  })

  it('deletes the account via DELETE', async () => {
    const fetchMock = mockFetchOnce({ data: { deleted: true } })
    const { Wrapper } = createWrapper()
    const { result } = renderHook(() => useDeleteAccount(), {
      wrapper: Wrapper,
    })
    await result.current.mutateAsync()
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/account',
      expect.objectContaining({ method: 'DELETE' }),
    )
  })
})
