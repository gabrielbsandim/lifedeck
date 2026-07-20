import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import {
  useChangePassword,
  useDeleteAccount,
  useRenameUser,
  useRemoveAvatar,
  usePreviewWeatherLocation,
  useSetCarryOverMode,
  useSetReminderPreferences,
  useSetTimezone,
  useSetWeatherLocation,
  useSignOut,
  useSyncTimezone,
  useUploadAvatar,
} from '@/lib/api/use-account'
import { createWrapper, mockFetchOnce } from '@/lib/api/test-utils'
import type * as DatesModule from '@/lib/api/dates'

vi.mock('@/lib/api/dates', async original => {
  const actual = await original<typeof DatesModule>()
  return { ...actual, browserTimeZone: () => 'America/Sao_Paulo' }
})

const USER = {
  id: 'a1c8f2e4-5b6d-4c7e-8f90-1a2b3c4d5e6f',
  displayName: 'Noiva',
  email: 'gab@example.com',
  isGuest: false,
  isEmailVerified: true,
  hasPassword: true,
  locale: 'en',
  timezone: 'UTC',
  avatarUrl: null,
  carryOverMode: 'manual' as const,
  reminderEmail: false,
  reminderWhatsapp: true,
  weatherLocation: null,
  createdAt: '2026-06-22T10:00:00.000Z',
}

describe('account hooks', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    localStorage.clear()
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

  it('sets reminder preferences via PATCH', async () => {
    const fetchMock = mockFetchOnce({
      data: { ...USER, reminderEmail: true },
    })
    const { Wrapper } = createWrapper()
    const { result } = renderHook(() => useSetReminderPreferences(), {
      wrapper: Wrapper,
    })
    await result.current.mutateAsync({ email: true })
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/account/reminders',
      expect.objectContaining({ method: 'PATCH' }),
    )
  })

  it('saves the default weather location via PATCH', async () => {
    const fetchMock = mockFetchOnce({
      data: { ...USER, weatherLocation: 'Mogi das Cruzes' },
    })
    const { Wrapper } = createWrapper()
    const { result } = renderHook(() => useSetWeatherLocation(), {
      wrapper: Wrapper,
    })
    await result.current.mutateAsync('Mogi das Cruzes')
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/account/weather-location',
      expect.objectContaining({ method: 'PATCH' }),
    )
  })

  it('previews a weather location via POST and returns the resolution', async () => {
    const fetchMock = mockFetchOnce({
      data: { ok: true, location: 'Lisbon, Portugal' },
    })
    const { Wrapper } = createWrapper()
    const { result } = renderHook(() => usePreviewWeatherLocation(), {
      wrapper: Wrapper,
    })
    const resolution = await result.current.mutateAsync('lisbon')
    expect(resolution).toEqual({ ok: true, location: 'Lisbon, Portugal' })
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/account/weather-location/preview',
      expect.objectContaining({ method: 'POST' }),
    )
  })

  it('clears the default weather location with null', async () => {
    const fetchMock = mockFetchOnce({
      data: { ...USER, weatherLocation: null },
    })
    const { Wrapper } = createWrapper()
    const { result } = renderHook(() => useSetWeatherLocation(), {
      wrapper: Wrapper,
    })
    await result.current.mutateAsync(null)
    expect(JSON.parse(fetchMock.mock.calls[0]?.[1]?.body as string)).toEqual({
      location: null,
    })
  })

  it('uploads an avatar via POST with the image content-type', async () => {
    const fetchMock = mockFetchOnce({
      data: { ...USER, avatarUrl: 'https://blob.test/a.webp' },
    })
    const { Wrapper } = createWrapper()
    const { result } = renderHook(() => useUploadAvatar(), { wrapper: Wrapper })
    await result.current.mutateAsync(
      new Blob([new Uint8Array([1, 2])], { type: 'image/webp' }),
    )
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/account/avatar',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ 'content-type': 'image/webp' }),
      }),
    )
  })

  it('removes the avatar via DELETE', async () => {
    const fetchMock = mockFetchOnce({ data: USER })
    const { Wrapper } = createWrapper()
    const { result } = renderHook(() => useRemoveAvatar(), { wrapper: Wrapper })
    await result.current.mutateAsync()
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/account/avatar',
      expect.objectContaining({ method: 'DELETE' }),
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

  it('syncs the detected timezone when it differs', async () => {
    const fetchMock = mockFetchOnce({
      data: { ...USER, timezone: 'America/Sao_Paulo' },
    })
    const { Wrapper } = createWrapper()
    renderHook(() => useSyncTimezone(USER), { wrapper: Wrapper })
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/v1/account/timezone',
        expect.objectContaining({ method: 'PATCH' }),
      ),
    )
  })

  it('does not auto-sync once the zone has been pinned', async () => {
    localStorage.setItem(`lifedeck.tz.pinned.${USER.id}`, '1')
    const fetchMock = mockFetchOnce({ data: USER })
    const { Wrapper } = createWrapper()
    renderHook(() => useSyncTimezone({ ...USER, timezone: 'Europe/Lisbon' }), {
      wrapper: Wrapper,
    })
    await Promise.resolve()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('pins the zone after a manual change so it is never auto-reverted', async () => {
    mockFetchOnce({ data: { ...USER, timezone: 'UTC' } })
    const { Wrapper } = createWrapper()
    const { result } = renderHook(() => useSetTimezone(), { wrapper: Wrapper })
    await result.current.mutateAsync('UTC')
    expect(localStorage.getItem(`lifedeck.tz.pinned.${USER.id}`)).toBe('1')

    // A later auto-sync must respect the pin even though the zone is UTC.
    const fetchMock = mockFetchOnce({ data: USER })
    renderHook(() => useSyncTimezone({ ...USER, timezone: 'UTC' }), {
      wrapper: Wrapper,
    })
    await Promise.resolve()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('ignores syncing when there is no user', async () => {
    const fetchMock = mockFetchOnce({ data: USER })
    const { Wrapper } = createWrapper()
    renderHook(() => useSyncTimezone(null), { wrapper: Wrapper })
    await Promise.resolve()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('sets the timezone manually via PATCH', async () => {
    const fetchMock = mockFetchOnce({
      data: { ...USER, timezone: 'Europe/Lisbon' },
    })
    const { Wrapper } = createWrapper()
    const { result } = renderHook(() => useSetTimezone(), { wrapper: Wrapper })
    await result.current.mutateAsync('Europe/Lisbon')
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/account/timezone',
      expect.objectContaining({ method: 'PATCH' }),
    )
  })
})
