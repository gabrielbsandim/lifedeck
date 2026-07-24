import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { getMessages } from '@lifedeck/i18n'
import type { AnalyticsView } from '@lifedeck/application'
import { MessagesProvider } from '@/lib/i18n/messages-provider'
import { createWrapper } from '@/lib/api/test-utils'
import { AnalyticsScreen } from '@/components/analytics-screen'

const en = getMessages('en')

const VIEW: AnalyticsView = {
  from: '2026-06-16',
  to: '2026-06-22',
  totalTasks: 10,
  totalCompleted: 7,
  completionRate: 0.7,
  currentStreak: 3,
  days: Array.from({ length: 7 }, (_, index) => ({
    date: `2026-06-${16 + index}`,
    total: 2,
    completed: 1,
  })),
  habits: {
    active: 2,
    completions: 9,
    bestStreak: 5,
    consistency: 0.75,
    items: [
      {
        id: 'h1',
        title: 'Meditate',
        currentStreak: 5,
        completions: 6,
        expected: 7,
      },
      {
        id: 'h2',
        title: 'Read',
        currentStreak: 0,
        completions: 3,
        expected: 7,
      },
    ],
  },
}

function stubAnalytics(view: AnalyticsView) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ data: view }),
    })),
  )
}

function renderScreen() {
  const { Wrapper } = createWrapper()
  return render(
    <Wrapper>
      <MessagesProvider locale="en" messages={en}>
        <AnalyticsScreen />
      </MessagesProvider>
    </Wrapper>,
  )
}

describe('AnalyticsScreen habits section', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('renders the habit consistency and per-habit breakdown', async () => {
    stubAnalytics(VIEW)
    renderScreen()

    expect(
      await screen.findByText(en.analytics.habitsTitle),
    ).toBeInTheDocument()
    expect(screen.getByText('75%')).toBeInTheDocument()
    expect(screen.getByText('Meditate')).toBeInTheDocument()
    expect(screen.getByText('Read')).toBeInTheDocument()
    expect(
      screen.getByText(`6 ${en.analytics.expectedOf} 7`),
    ).toBeInTheDocument()
  })

  it('shows an empty state when there are no active habits', async () => {
    stubAnalytics({
      ...VIEW,
      habits: {
        active: 0,
        completions: 0,
        bestStreak: 0,
        consistency: 0,
        items: [],
      },
    })
    renderScreen()

    expect(
      await screen.findByText(en.analytics.habitsEmpty),
    ).toBeInTheDocument()
  })
})
