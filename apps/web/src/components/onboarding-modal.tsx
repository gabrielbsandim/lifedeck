'use client'

import { useEffect, useState } from 'react'
import { Dialog } from '@lifedeck/ui'
import { useI18n } from '@/lib/i18n/messages-provider'
import { useSession } from '@/lib/api/use-session'
import { useCalendarConnections } from '@/lib/api/use-calendar-connections'
import { useWhatsappChannel } from '@/lib/api/use-pairing'
import { ConnectionsPanel } from '@/components/connections/connections-panel'

const DISMISS_KEY = 'ld:get-started-dismissed'

/** Centered on desktop, a bottom sheet on phones. */
function useWideViewport() {
  const [wide, setWide] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 640px)')
    const update = () => setWide(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])
  return wide
}

/**
 * First-run onboarding: connect Google Calendar and WhatsApp. It only appears
 * while something is actually left to connect (a WhatsApp not yet linked, or a
 * calendar the user is entitled to but has not connected), so it stops showing
 * once the user is set up, on every device, without relying on a local flag.
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
  const wide = useWideViewport()

  const connections = useCalendarConnections(calendarEnabled)
  const whatsapp = useWhatsappChannel(whatsappEnabled)

  const entitledCalendar = Boolean(user?.entitlements?.includes('calendarSync'))
  const calendarConnected = (connections.data?.length ?? 0) > 0
  const whatsappLinked = whatsapp.data?.status === 'linked'

  // A step is "pending" only when the user can act on it now: an entitled but
  // unconnected calendar, or an unlinked WhatsApp. A free user's calendar is an
  // upsell, not an onboarding step, so it does not keep the modal open.
  const calendarPending =
    calendarEnabled && entitledCalendar && !calendarConnected
  const whatsappPending = whatsappEnabled && !whatsappLinked
  const hasSomething = calendarPending || whatsappPending

  // Wait for the status queries to resolve before deciding, so the modal never
  // flashes open and then closes once we learn a channel is already connected.
  const ready =
    (!calendarEnabled || connections.isSuccess) &&
    (!whatsappEnabled || whatsapp.isSuccess)

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

  const open = registered && ready && !dismissed && hasSomething

  return (
    <Dialog
      open={open}
      onClose={dismiss}
      title={t.title}
      variant={wide ? 'center' : 'sheet'}
    >
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
