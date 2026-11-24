// Plans on mobile.
//
// The app never sells in-app. Where store rules allow a purchase link (see
// lib/billing/web-checkout.ts), the plan buttons open the web billing page
// signed in as this account; everywhere else the screen is read-only. An
// upgrade bought on the web unlocks here on the next session refresh.
import { useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { CheckIcon } from '@/components/icons'
import { Badge, Button, Card, Screen, Tabs } from '@/components/ui'
import {
  CURRENCY_BY_MARKET,
  MARKET_BY_CURRENCY,
  annualEquivalentMonthly,
  defaultMarket,
  formatPrice,
  priceLabel,
  type Currency,
  type Interval,
  type Market,
  type PaidPlan,
} from '@/lib/billing/prices'
import { planName } from '@/lib/billing/plan-display'
import { useWebCheckout } from '@/lib/billing/use-web-checkout'
import { useSession } from '@/lib/api/use-session'
import { useI18n } from '@/lib/i18n/messages-provider'
import { useThemeColors } from '@/theme/tokens'

function PlanCard({
  name,
  tagline,
  price,
  priceNote,
  bullets,
  bulletsHeading,
  current,
  recommended,
  onChoose,
  isChoosing,
  chooseLabel,
  currentLabel,
}: {
  name: string
  tagline: string
  price: string
  priceNote: string
  bullets: readonly string[]
  bulletsHeading?: string
  current: boolean
  recommended?: boolean
  onChoose?: () => void
  isChoosing?: boolean
  chooseLabel: string
  currentLabel: string
}) {
  const colors = useThemeColors()
  return (
    <Card
      className={
        recommended ? 'border-brand-500 gap-3 border-2 p-5' : 'gap-3 p-5'
      }
    >
      <View className="flex-row items-center gap-2">
        <Text className="text-ink-900 text-xl font-bold">{name}</Text>
        {current ? <Badge tone="brand">{currentLabel}</Badge> : null}
      </View>
      <Text className="text-ink-500 text-sm">{tagline}</Text>
      <View className="flex-row items-baseline gap-2">
        <Text className="text-ink-900 text-3xl font-extrabold">{price}</Text>
      </View>
      <Text className="text-ink-400 text-xs">{priceNote}</Text>
      {bulletsHeading ? (
        <Text className="text-ink-700 text-xs font-semibold uppercase">
          {bulletsHeading}
        </Text>
      ) : null}
      <View className="gap-2">
        {bullets.map(bullet => (
          <View key={bullet} className="flex-row items-start gap-2">
            <View className="mt-0.5">
              <CheckIcon size={14} color={colors.success} />
            </View>
            <Text className="text-ink-700 flex-1 text-sm">{bullet}</Text>
          </View>
        ))}
      </View>
      {onChoose && !current ? (
        <Button onPress={onChoose} isLoading={isChoosing}>
          {chooseLabel}
        </Button>
      ) : null}
    </Card>
  )
}

export default function BillingScreen() {
  const { messages } = useI18n()
  const t = messages.billing
  const p = t.promo
  const session = useSession()
  const checkout = useWebCheckout()
  const choose = checkout.allowed ? checkout.open : undefined

  const [interval, setInterval] = useState<Interval>('annual')
  const [currencyOverride, setCurrencyOverride] = useState<Currency | null>(
    null,
  )

  const currentPlan = session.data?.plan ?? 'free'
  const detected = defaultMarket(session.data?.country, session.data?.locale)
  const market: Market = currencyOverride
    ? MARKET_BY_CURRENCY[currencyOverride]
    : detected
  const currency = CURRENCY_BY_MARKET[market]
  const annual = interval === 'annual'
  const per = annual ? t.perYear : t.perMonth

  function priceNote(plan: PaidPlan): string {
    if (!annual) {
      return p.billedMonthly
    }
    const eq = formatPrice(annualEquivalentMonthly(market, plan), currency)
    return t.eqApprox.replace('{amount}', eq)
  }

  return (
    <Screen>
      <View className="gap-1">
        <Text className="text-ink-900 text-[28px] font-bold">
          {t.plansTitle}
        </Text>
        <Text className="text-ink-500 text-sm">{t.tagline}</Text>
      </View>

      <Tabs
        tabs={[
          { value: 'monthly', label: t.monthly },
          { value: 'annual', label: `${t.annual} · ${t.annualHint}` },
        ]}
        value={interval}
        onChange={value => setInterval(value as Interval)}
      />

      <Tabs
        tabs={[
          { value: 'BRL', label: t.currencyLongBRL },
          { value: 'USD', label: t.currencyLongUSD },
        ]}
        value={currency}
        onChange={value => setCurrencyOverride(value as Currency)}
      />

      <PlanCard
        name={t.free}
        tagline={p.tagFree}
        price={p.freeForever}
        priceNote={t.noCharge}
        bullets={p.freeBullets}
        current={currentPlan === 'free'}
        chooseLabel={p.freeCta}
        currentLabel={t.yourPlanBadge}
      />

      <PlanCard
        name={t.pro}
        tagline={p.tagPro}
        price={`${priceLabel(market, 'pro', interval)}${per}`}
        priceNote={priceNote('pro')}
        bullets={p.proBullets}
        bulletsHeading={p.moreThanFree}
        current={currentPlan === 'pro'}
        recommended
        onChoose={choose}
        isChoosing={checkout.isOpening}
        chooseLabel={t.subscribePlan.replace('{plan}', t.pro)}
        currentLabel={t.yourPlanBadge}
      />

      <PlanCard
        name={t.premium}
        tagline={p.tagPremium}
        price={`${priceLabel(market, 'premium', interval)}${per}`}
        priceNote={priceNote('premium')}
        bullets={p.premiumBullets}
        bulletsHeading={p.moreThanPro}
        current={currentPlan === 'premium'}
        onChoose={choose}
        isChoosing={checkout.isOpening}
        chooseLabel={t.subscribePlan.replace('{plan}', t.premium)}
        currentLabel={t.yourPlanBadge}
      />

      <Card className="gap-2 p-4">
        <Text className="text-ink-700 text-sm font-semibold">
          {t.yourPlan}: {planName(currentPlan, messages)}
        </Text>
        {choose ? (
          <>
            <Text className="text-ink-500 text-xs">{t.footerCancel}</Text>
            <Pressable accessibilityRole="button" onPress={choose}>
              <Text className="text-brand-accent text-sm font-semibold">
                {t.manage}
              </Text>
            </Pressable>
          </>
        ) : null}
        {checkout.failed ? (
          <Text className="text-danger text-xs" accessibilityRole="alert">
            {messages.common.error}
          </Text>
        ) : null}
      </Card>

      <Text className="text-ink-400 text-center text-xs">
        {t.pricesIn.replace('{currency}', currency)}
      </Text>
    </Screen>
  )
}
