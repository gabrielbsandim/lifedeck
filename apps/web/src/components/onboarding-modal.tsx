'use client'

import { useState } from 'react'
import { Dialog } from '@lifedeck/ui'
import { useI18n } from '@/lib/i18n/messages-provider'
import { useSession } from '@/lib/api/use-session'
import { useCalendarConnections } from '@/lib/api/use-calendar-connections'
import { ConnectionsPanel } from '@/components/connections/connections-panel'

const DISMISS_KEY = 'ld:get-started-dismissed'

/**
 * First-run onboarding shown as a bottom sheet: connect Google Calendar and
 * WhatsApp, or dismiss with "set up later" (also reachable anytime in Settings).
 */
export function OnboardingModal() {
  const { messages } = useI18n()
  const t = messages.getStarted
  const session = useSession()
  const user = session.data
  const registered = Boolean(user && !user.isGuest && user.email !== null)
  const features = user?.features
  const calendarEnabled = registered && Boolean(features?.calendar)
  const whatsappEnabled = registered && Boolean(features?.whatsapp)

  const connections = useCalendarConnections(calendarEnabled)
  const calendarConnected = (connections.data?.length ?? 0) > 0
  const hasSomething =
    (calendarEnabled && !calendarConnected) || whatsappEnabled

  const [dismissed, setDismissed] = useState(
    () =>
      typeof window !== 'undefined' &&
      window.localStorage.getItem(DISMISS_KEY) === '1',
  )

  const dismiss = () => {
    if (typeof window !== 'undefined')
      window.localStorage.setItem(DISMISS_KEY, '1')
    setDismissed(true)
  }

  const open = registered && !dismissed && hasSomething

  return (
    <Dialog open={open} onClose={dismiss} title={t.title} variant="sheet">
      <div className="flex flex-col gap-4">
        <p className="text-ink-500 -mt-2 text-sm">{t.subtitle}</p>
        <div className="max-h-[62vh] overflow-y-auto">
          <ConnectionsPanel />
        </div>
        <div className="flex flex-col gap-1">
          <button
            type="button"
            onClick={dismiss}
            className="text-ink-600 hover:bg-bg h-9 rounded-lg text-sm font-medium"
          >
            {t.later}
          </button>
          <p className="text-ink-400 text-center text-xs">{t.settingsHint}</p>
        </div>
      </div>
    </Dialog>
  )
}
