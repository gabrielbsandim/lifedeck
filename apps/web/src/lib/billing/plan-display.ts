import type { Messages } from '@lifedeck/i18n'
import type { SubscriptionView } from '@lifedeck/application'
import type { Plan } from '@/lib/billing/prices'

export type PlanBadge = {
  label: string
  tone: 'success' | 'warning' | 'neutral'
}

/** Localized plan name (Free / Pro / Premium). */
export function planName(plan: Plan, messages: Messages): string {
  return plan === 'free'
    ? messages.billing.free
    : plan === 'pro'
      ? messages.billing.pro
      : messages.billing.premium
}

/** Small status pill shown next to the plan name on the plan card. */
export function subscriptionBadge(
  subscription: Pick<SubscriptionView, 'status' | 'cancelAtPeriodEnd'> | null,
  messages: Messages,
): PlanBadge {
  const t = messages.billing
  if (!subscription) {
    return { label: t.statusActive, tone: 'success' }
  }
  if (subscription.cancelAtPeriodEnd) {
    return { label: t.notRenewing, tone: 'warning' }
  }
  switch (subscription.status) {
    case 'active':
    case 'trialing':
      return { label: t.statusActive, tone: 'success' }
    case 'past_due':
      return { label: t.statusPastDue, tone: 'warning' }
    case 'canceled':
      return { label: t.statusCanceled, tone: 'neutral' }
    default:
      return { label: t.statusActive, tone: 'success' }
  }
}

function formatDate(iso: string, locale: string): string {
  return new Intl.DateTimeFormat(locale === 'pt' ? 'pt-BR' : 'en', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(iso))
}

/** "Renews on 3 August 2026" / "Access until …" / "No charge". */
export function renewLine(
  plan: Plan,
  subscription: Pick<
    SubscriptionView,
    'currentPeriodEnd' | 'cancelAtPeriodEnd'
  > | null,
  locale: string,
  messages: Messages,
): string {
  const t = messages.billing
  if (plan === 'free' || !subscription?.currentPeriodEnd) {
    return t.noCharge
  }
  const date = formatDate(subscription.currentPeriodEnd, locale)
  return subscription.cancelAtPeriodEnd
    ? `${t.accessUntil} ${date}`
    : `${t.renewsOn} ${date}`
}
