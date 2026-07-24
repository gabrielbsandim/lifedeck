import { afterEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { getMessages } from '@lifedeck/i18n'
import type { NotificationView } from '@lifedeck/application'
import { MessagesProvider } from '@/lib/i18n/messages-provider'
import { createWrapper } from '@/lib/api/test-utils'
import { NotificationBell } from '@/components/notification-bell'

const en = getMessages('en')

const REMINDER: NotificationView = {
  id: '11111111-1111-4111-8111-111111111111',
  type: 'event-reminder',
  data: {
    eventId: 'e1',
    title: 'Dentist',
    startsAt: '2026-07-28T18:30:00.000Z',
    minutesBefore: '30',
  },
  isRead: false,
  createdAt: '2026-07-28T18:00:00.000Z',
}

function stubApi(items: NotificationView[]) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => {
      const body =
        url === '/api/v1/sessions/me'
          ? {
              data: {
                id: 'u1',
                displayName: 'Gabriel',
                timezone: 'America/Sao_Paulo',
              },
            }
          : { data: { items, unread: items.filter(i => !i.isRead).length } }
      return { ok: true, status: 200, json: async () => body }
    }),
  )
}

function renderBell() {
  const { Wrapper } = createWrapper()
  return render(
    <Wrapper>
      <MessagesProvider locale="en" messages={en}>
        <NotificationBell />
      </MessagesProvider>
    </Wrapper>,
  )
}

describe('NotificationBell', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('renders an event reminder with its title and time, not the raw type', async () => {
    stubApi([REMINDER])
    renderBell()

    fireEvent.click(screen.getByLabelText(en.notifications.open))

    expect(await screen.findByText('Reminder: Dentist')).toBeInTheDocument()
    expect(screen.queryByText('event-reminder')).not.toBeInTheDocument()
    // The event's local start renders as a readable subtitle (São Paulo is
    // UTC-3, so 18:30Z is 3:30 PM on Jul 28).
    expect(screen.getByText(/Jul 28.*3:30/)).toBeInTheDocument()
  })

  it('falls back to a generic label for an unknown type', async () => {
    stubApi([{ ...REMINDER, type: 'mystery', data: {} }])
    renderBell()

    fireEvent.click(screen.getByLabelText(en.notifications.open))

    expect(
      await screen.findByText(en.notifications.generic),
    ).toBeInTheDocument()
    expect(screen.queryByText('mystery')).not.toBeInTheDocument()
  })
})
