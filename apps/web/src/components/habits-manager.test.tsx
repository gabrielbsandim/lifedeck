import { afterEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { getMessages } from '@lifedeck/i18n'
import type { HabitView } from '@lifedeck/application'
import { MessagesProvider } from '@/lib/i18n/messages-provider'
import { createWrapper } from '@/lib/api/test-utils'
import { HabitsManager } from '@/components/habits-manager'

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }))

const en = getMessages('en')

const HABIT: HabitView = {
  id: 'c3e0f4a6-7d8e-4f90-a1b2-c3d4e5f6a7b8',
  ownerId: 'a1c8f2e4-5b6d-4c7e-8f90-1a2b3c4d5e6f',
  title: 'Meditate',
  cadence: { kind: 'daily' },
  checkinHour: null,
  active: true,
  createdAt: '2026-07-01T10:00:00.000Z',
  currentStreak: 1,
  doneToday: true,
  scheduledToday: true,
  recentDays: [
    { date: '2026-07-14', done: false, scheduled: true },
    { date: '2026-07-15', done: false, scheduled: true },
    { date: '2026-07-16', done: false, scheduled: true },
    { date: '2026-07-17', done: false, scheduled: true },
    { date: '2026-07-18', done: false, scheduled: true },
    { date: '2026-07-19', done: false, scheduled: true },
    { date: '2026-07-20', done: true, scheduled: true },
  ],
}

// Route fetch by URL so both the session probe and the habit list resolve, and
// capture the log POST for assertion.
function stubApi() {
  const calls: { url: string; init?: RequestInit }[] = []
  const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    calls.push({ url, init })
    const body =
      url === '/api/v1/sessions/me'
        ? { data: { id: HABIT.ownerId, displayName: 'Gabriel', plan: 'pro' } }
        : url === '/api/v1/habits'
          ? { data: [HABIT] }
          : { data: HABIT }
    return { ok: true, status: 200, json: async () => body }
  })
  vi.stubGlobal('fetch', fetchMock)
  return calls
}

function renderManager() {
  const { Wrapper } = createWrapper()
  return render(
    <Wrapper>
      <MessagesProvider locale="en" messages={en}>
        <HabitsManager />
      </MessagesProvider>
    </Wrapper>,
  )
}

describe('HabitsManager', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('backfills a past day by POSTing its date to the logs endpoint', async () => {
    const calls = stubApi()
    renderManager()

    // Tap the 2026-07-19 (yesterday) cell in the week strip.
    const cell = await screen.findByLabelText(
      `${en.habits.toggleDay} 2026-07-19`,
    )
    fireEvent.click(cell)

    await waitFor(() => {
      const post = calls.find(
        call =>
          call.url === `/api/v1/habits/${HABIT.id}/logs` &&
          call.init?.method === 'POST',
      )
      expect(post).toBeDefined()
      expect(JSON.parse(String(post?.init?.body))).toEqual({
        date: '2026-07-19',
        done: true,
      })
    })
  })
})
