'use client'

import { useState, type ReactNode } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { cn } from '@lifedeck/ui'
import type { SessionUser } from '@/lib/api/use-session'
import { useSession } from '@/lib/api/use-session'
import { useI18n } from '@/lib/i18n/messages-provider'
import type { Messages } from '@lifedeck/i18n'
import {
  ChartIcon,
  ChevronRightIcon,
  CodeIcon,
  DeckGlyph,
  LinkIcon,
  LockIcon,
  RecurringIcon,
  SlidersIcon,
  UserIcon,
} from '@/components/icons'
import { AuthDialog } from '@/components/auth-dialog'
import {
  HubRow,
  HubRowGroup,
  SettingsGroup,
  SubpageHeader,
} from '@/components/settings/settings-ui'
import {
  AccountSection,
  ConnectionsSection,
  PlanSection,
  PreferencesSection,
  ProfileSection,
  SecuritySection,
} from '@/components/settings/settings-sections'
import { planName } from '@/lib/billing/plan-display'

export type SectionKey =
  | 'perfil'
  | 'conexoes'
  | 'preferencias'
  | 'seguranca'
  | 'plano'
  | 'conta'

type SectionMeta = {
  key: SectionKey
  label: string
  icon: ReactNode
  iconClass: string
}

function sectionCatalog(messages: Messages): Record<SectionKey, SectionMeta> {
  return {
    perfil: {
      key: 'perfil',
      label: messages.settings.profile,
      icon: <UserIcon size={16} />,
      iconClass: 'bg-brand-600',
    },
    conexoes: {
      key: 'conexoes',
      label: messages.settings.connections,
      icon: <LinkIcon size={16} />,
      iconClass: 'bg-brand-600',
    },
    preferencias: {
      key: 'preferencias',
      label: messages.settings.preferences,
      icon: <SlidersIcon size={16} />,
      iconClass: 'bg-ink-500',
    },
    seguranca: {
      key: 'seguranca',
      label: messages.settings.security,
      icon: <LockIcon size={15} />,
      iconClass: 'bg-warning',
    },
    plano: {
      key: 'plano',
      label: messages.settings.plan,
      icon: <DeckGlyph size={18} />,
      iconClass: 'from-brand-600 to-violet-500 bg-gradient-to-br',
    },
    conta: {
      key: 'conta',
      label: messages.settings.account,
      icon: <UserIcon size={16} />,
      iconClass: 'bg-ink-500',
    },
  }
}

export function availableSections(
  user: SessionUser,
  messages: Messages,
): SectionMeta[] {
  const catalog = sectionCatalog(messages)
  const hasConnections = Boolean(
    user.features?.calendar || user.features?.whatsapp,
  )
  const keys: SectionKey[] = ['perfil']
  if (hasConnections) {
    keys.push('conexoes')
  }
  keys.push('preferencias')
  if (user.hasPassword) {
    keys.push('seguranca')
  }
  if (user.features?.billing) {
    keys.push('plano')
  }
  keys.push('conta')
  return keys.map(key => catalog[key])
}

function SectionBody({
  section,
  user,
  onSignedOut,
}: {
  section: SectionKey
  user: SessionUser
  onSignedOut: () => void
}) {
  switch (section) {
    case 'perfil':
      return <ProfileSection user={user} />
    case 'conexoes':
      return <ConnectionsSection />
    case 'preferencias':
      return <PreferencesSection user={user} />
    case 'seguranca':
      return <SecuritySection />
    case 'plano':
      return <PlanSection />
    case 'conta':
      return <AccountSection onSignedOut={onSignedOut} />
  }
}

/** Desktop: inner nav column + plan teaser card. */
function DesktopNav({
  sections,
  active,
  onSelect,
  isFree,
  planLabel,
}: {
  sections: SectionMeta[]
  active: SectionKey
  onSelect: (key: SectionKey) => void
  isFree: boolean
  planLabel: string
}) {
  const { messages } = useI18n()
  return (
    <div className="flex w-56 shrink-0 flex-col gap-0.5">
      {sections.map(section => {
        const isActive = section.key === active
        return (
          <button
            key={section.key}
            type="button"
            onClick={() => onSelect(section.key)}
            aria-current={isActive ? 'true' : undefined}
            className={cn(
              'flex items-center gap-2.5 rounded-[10px] px-3 py-2.5 text-left text-sm transition-colors',
              isActive
                ? 'bg-brand-50 text-brand-700 font-semibold'
                : 'text-ink-600 hover:bg-bg font-medium',
            )}
          >
            {section.label}
          </button>
        )
      })}
      <Link
        href="/settings/billing"
        className="from-brand-600 mt-3.5 flex flex-col gap-1.5 rounded-2xl bg-gradient-to-br to-violet-500 p-3.5 text-white transition-transform active:scale-[0.98]"
      >
        <span className="text-[11px] font-bold tracking-[0.08em] opacity-75">
          {messages.settings.planWord.toUpperCase()} {planLabel.toUpperCase()}
        </span>
        <span className="text-[13px] font-semibold leading-snug">
          {isFree ? messages.settings.teaserFree : messages.settings.teaserPaid}
        </span>
      </Link>
    </div>
  )
}

/** Mobile: the profile hub that drills into each section. */
function MobileHub({
  user,
  sections,
  onSelect,
  isFree,
  planLabel,
  hasBilling,
}: {
  user: SessionUser
  sections: SectionMeta[]
  onSelect: (key: SectionKey) => void
  isFree: boolean
  planLabel: string
  hasBilling: boolean
}) {
  const { messages } = useI18n()
  const configKeys: SectionKey[] = ['conexoes', 'preferencias', 'seguranca']
  const configSections = sections.filter(s => configKeys.includes(s.key))
  const initials = user.displayName.slice(0, 2).toUpperCase()

  return (
    <div className="flex flex-col gap-4">
      <button
        type="button"
        onClick={() => onSelect('perfil')}
        className="border-line flex items-center gap-3 rounded-2xl border bg-white p-3.5 text-left shadow-sm transition-transform active:scale-[0.99]"
      >
        <span className="from-brand-600 flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-full bg-gradient-to-br to-violet-500 text-lg font-semibold text-white">
          {initials}
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="text-ink-900 text-base font-semibold">
            {user.displayName}
          </span>
          <span className="text-ink-500 truncate text-[13px]">
            {user.email}
          </span>
          {user.isEmailVerified && (
            <span className="text-success flex items-center gap-1.5 text-xs font-medium">
              <span className="bg-success h-1.5 w-1.5 rounded-full" />
              {messages.auth.verified}
            </span>
          )}
        </span>
        <ChevronRightIcon size={16} className="text-ink-300 shrink-0" />
      </button>

      {hasBilling &&
        (isFree ? (
          <Link
            href="/settings/billing"
            className="from-brand-600 relative flex flex-col gap-2 overflow-hidden rounded-2xl bg-gradient-to-br to-violet-500 p-4 text-white"
          >
            <span className="text-[11px] font-bold tracking-[0.1em] opacity-70">
              {messages.settings.planWord.toUpperCase()}{' '}
              {planLabel.toUpperCase()}
            </span>
            <span className="max-w-[16rem] text-[13px] leading-relaxed opacity-90">
              {messages.settings.teaserFree}
            </span>
            <span className="text-brand-700 mt-1 w-fit rounded-full bg-white px-4 py-1.5 text-[13px] font-semibold">
              {messages.billing.seePlans}
            </span>
          </Link>
        ) : (
          <button
            type="button"
            onClick={() => onSelect('plano')}
            className="border-line flex items-center gap-3 rounded-2xl border bg-white p-3.5 text-left shadow-sm"
          >
            <span className="from-brand-600 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br to-violet-500">
              <DeckGlyph size={22} className="text-white" />
            </span>
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="text-ink-900 text-[15px] font-semibold">
                {messages.settings.planWord} {planLabel}
              </span>
              <span className="text-ink-500 text-[13px]">
                {messages.settings.teaserPaid}
              </span>
            </span>
            <ChevronRightIcon size={16} className="text-ink-300 shrink-0" />
          </button>
        ))}

      <SettingsGroup title={messages.settings.hubConfig}>
        <HubRowGroup>
          {configSections.map(section => (
            <HubRow
              key={section.key}
              icon={section.icon}
              iconClassName={section.iconClass}
              label={section.label}
              onClick={() => onSelect(section.key)}
            />
          ))}
        </HubRowGroup>
      </SettingsGroup>

      <SettingsGroup title={messages.settings.hubTools}>
        <HubRowGroup>
          <HubRow
            icon={<ChartIcon size={16} />}
            iconClassName="bg-violet-500"
            label={messages.nav.analytics}
            href="/analytics"
          />
          <HubRow
            icon={<RecurringIcon size={16} />}
            iconClassName="bg-success"
            label={messages.recurring.manage}
            href="/recurring"
          />
          <HubRow
            icon={<CodeIcon size={16} />}
            iconClassName="bg-ink-700"
            label={messages.nav.developers}
            href="/developers"
          />
        </HubRowGroup>
      </SettingsGroup>

      <SettingsGroup title={messages.settings.hubAccount}>
        <HubRowGroup>
          <HubRow
            icon={<UserIcon size={16} />}
            iconClassName="bg-ink-500"
            label={messages.settings.account}
            onClick={() => onSelect('conta')}
          />
        </HubRowGroup>
      </SettingsGroup>
    </div>
  )
}

export function SettingsExperience() {
  const { messages } = useI18n()
  const session = useSession()
  const router = useRouter()
  const user = session.data
  const [active, setActive] = useState<SectionKey | null>(null)
  const [authOpen, setAuthOpen] = useState(false)

  if (!user) {
    return null
  }

  if (user.isGuest || user.email === null) {
    return (
      <div className="flex flex-col items-start gap-4">
        <h1 className="text-ink-900 text-2xl font-bold tracking-tight">
          {messages.settings.title}
        </h1>
        <p className="text-ink-500 text-sm">
          {messages.auth.createAccountSubtitle}
        </p>
        <button
          type="button"
          onClick={() => setAuthOpen(true)}
          className="bg-brand-600 hover:bg-brand-700 h-11 rounded-xl px-5 text-sm font-semibold text-white"
        >
          {messages.auth.createAccount}
        </button>
        <AuthDialog open={authOpen} onClose={() => setAuthOpen(false)} />
      </div>
    )
  }

  const sections = availableSections(user, messages)
  const plan = user.plan ?? 'free'
  const isFree = plan === 'free'
  const planLabel = planName(plan, messages)
  const hasBilling = Boolean(user.features?.billing)
  const goHome = () => router.push('/')
  const desktopActive = active ?? 'perfil'
  const activeLabel =
    sections.find(s => s.key === desktopActive)?.label ??
    messages.settings.title

  return (
    <>
      {/* Desktop: two-column inner nav */}
      <div className="hidden lg:block">
        <h1 className="text-ink-900 mb-6 text-2xl font-bold tracking-tight">
          {messages.settings.title}
        </h1>
        <div className="flex items-start gap-8">
          <DesktopNav
            sections={sections}
            active={desktopActive}
            onSelect={setActive}
            isFree={isFree}
            planLabel={planLabel}
          />
          <div className="min-w-0 max-w-2xl flex-1">
            <SectionBody
              section={desktopActive}
              user={user}
              onSignedOut={goHome}
            />
          </div>
        </div>
      </div>

      {/* Mobile: hub + drill-down */}
      <div className="lg:hidden">
        {active === null ? (
          <div className="flex flex-col gap-5">
            <h1 className="text-ink-900 text-[28px] font-bold tracking-tight">
              {messages.settings.profile}
            </h1>
            <MobileHub
              user={user}
              sections={sections}
              onSelect={setActive}
              isFree={isFree}
              planLabel={planLabel}
              hasBilling={hasBilling}
            />
          </div>
        ) : (
          <div className="flex flex-col">
            <SubpageHeader
              title={activeLabel}
              onBack={() => setActive(null)}
              backLabel={messages.auth.close}
            />
            <div className="pt-3 [animation:ld-slide-in_0.22s_cubic-bezier(0.2,0,0,1)]">
              <SectionBody section={active} user={user} onSignedOut={goHome} />
            </div>
          </div>
        )}
      </div>
    </>
  )
}
