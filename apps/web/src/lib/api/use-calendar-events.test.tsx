import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import {
  useCalendarEvents,
  useCreateCalendarEvent,
  useDeleteCalendarEvent,
  useDeleteCalendarOccurrence,
  useUpdateCalendarEvent,
  useUpdateCalendarOccurrence,
} from '@/lib/api/use-calendar-events'
import { createWrapper, mockFetchOnce } from '@/lib/api/test-utils'

const RANGE = {
  from: '2026-06-21T00:00:00.000Z',
  to: '2026-06-28T00:00:00.000Z',
}

const EVENT = {
  id: 'a1c8f2e4-5b6d-4c7e-8f90-1a2b3c4d5e6f',
  ownerId: 'b1c8f2e4-5b6d-4c7e-8f90-1a2b3c4d5e6f',
  title: 'Dentist',
  description: null,
  location: null,
  startsAt: '2026-06-24T09:00:00.000Z',
  endsAt: '2026-06-24T10:00:00.000Z',
  allDay: false,
  reminders: [],
  recurrence: null,
  recurring: false,
  seriesId: null,
  occurrenceStart: null,
  source: 'local',
  externalId: null,
  createdAt: '2026-06-24T08:00:00.000Z',
  updatedAt: '2026-06-24T08:00:00.000Z',
}

describe('useCalendarEvents', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('fetches events for the range', async () => {
    const fetchMock = mockFetchOnce({ data: [EVENT] })
    const { Wrapper } = createWrapper()
    const { result } = renderHook(() => useCalendarEvents(RANGE), {
      wrapper: Wrapper,
    })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual([EVENT])
    expect(fetchMock).toHaveBeenCalledWith(
      `/api/v1/calendar/events?from=${encodeURIComponent(RANGE.from)}&to=${encodeURIComponent(RANGE.to)}`,
      expect.objectContaining({ credentials: 'include' }),
    )
  })

  it('does not fetch when disabled', () => {
    const fetchMock = mockFetchOnce({ data: [] })
    const { Wrapper } = createWrapper()
    renderHook(() => useCalendarEvents(RANGE, false), { wrapper: Wrapper })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('creates an event', async () => {
    const fetchMock = mockFetchOnce({ data: EVENT })
    const { Wrapper } = createWrapper()
    const { result } = renderHook(() => useCreateCalendarEvent(RANGE), {
      wrapper: Wrapper,
    })
    result.current.mutate({
      title: 'Dentist',
      startsAt: EVENT.startsAt,
      endsAt: EVENT.endsAt,
    })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/calendar/events',
      expect.objectContaining({ method: 'POST' }),
    )
  })

  it('updates an event', async () => {
    const fetchMock = mockFetchOnce({ data: EVENT })
    const { Wrapper } = createWrapper()
    const { result } = renderHook(() => useUpdateCalendarEvent(RANGE), {
      wrapper: Wrapper,
    })
    result.current.mutate({ id: EVENT.id, input: { title: 'New' } })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(fetchMock).toHaveBeenCalledWith(
      `/api/v1/calendar/events/${EVENT.id}`,
      expect.objectContaining({ method: 'PATCH' }),
    )
  })

  it('deletes an event', async () => {
    const fetchMock = mockFetchOnce({ data: { deleted: true } })
    const { Wrapper } = createWrapper()
    const { result } = renderHook(() => useDeleteCalendarEvent(RANGE), {
      wrapper: Wrapper,
    })
    result.current.mutate(EVENT.id)
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(fetchMock).toHaveBeenCalledWith(
      `/api/v1/calendar/events/${EVENT.id}`,
      expect.objectContaining({ method: 'DELETE' }),
    )
  })

  it('edits a single occurrence', async () => {
    const fetchMock = mockFetchOnce({ data: EVENT })
    const { Wrapper } = createWrapper()
    const { result } = renderHook(() => useUpdateCalendarOccurrence(RANGE), {
      wrapper: Wrapper,
    })
    result.current.mutate({
      seriesId: EVENT.id,
      input: {
        occurrenceStart: EVENT.startsAt,
        title: 'Only this',
        startsAt: EVENT.startsAt,
        endsAt: EVENT.endsAt,
      },
    })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(fetchMock).toHaveBeenCalledWith(
      `/api/v1/calendar/events/${EVENT.id}/occurrences`,
      expect.objectContaining({ method: 'POST' }),
    )
  })

  it('deletes a single occurrence', async () => {
    const fetchMock = mockFetchOnce({ data: { deleted: true } })
    const { Wrapper } = createWrapper()
    const { result } = renderHook(() => useDeleteCalendarOccurrence(RANGE), {
      wrapper: Wrapper,
    })
    result.current.mutate({
      seriesId: EVENT.id,
      occurrenceStart: EVENT.startsAt,
    })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(fetchMock).toHaveBeenCalledWith(
      `/api/v1/calendar/events/${EVENT.id}/occurrences?occurrenceStart=${encodeURIComponent(EVENT.startsAt)}`,
      expect.objectContaining({ method: 'DELETE' }),
    )
  })
})
