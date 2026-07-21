'use client'

import { useState, type ReactNode } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useI18n } from '@/lib/i18n/messages-provider'
import { useSession } from '@/lib/api/use-session'
import {
  CURRENCY_BY_MARKET,
  MARKET_BY_CURRENCY,
  annualEquivalentMonthly,
  defaultMarket,
  formatPrice,
  priceAmount,
  priceLabel,
  type Currency,
  type Interval,
  type Market,
  type PaidPlan,
} from '@/lib/billing/prices'
import { CheckoutDialog } from '@/components/billing/checkout-dialog'
import '@/components/billing/plans.css'

// Render a translated string that may carry **bold** spans and \n line breaks
// (used by the WhatsApp mock bubbles).
function rich(text: string): ReactNode[] {
  return text.split('\n').flatMap((line, li) => {
    const segs = line
      .split(/\*\*(.+?)\*\*/g)
      .map((seg, i) =>
        i % 2 === 1 ? <strong key={`${li}-${i}`}>{seg}</strong> : seg,
      )
    return li === 0 ? segs : [<br key={`br-${li}`} />, ...segs]
  })
}

function Logo({ size = 26 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-label="Lifedeck">
      <rect
        x="13"
        y="4"
        width="15"
        height="20"
        rx="4.5"
        fill="var(--brand-100)"
      />
      <rect
        x="10"
        y="6.5"
        width="15"
        height="20"
        rx="4.5"
        fill="var(--brand-500)"
        opacity="0.85"
      />
      <rect
        x="7"
        y="9"
        width="15"
        height="20"
        rx="4.5"
        fill="var(--brand-cta)"
      />
      <circle cx="12" cy="14.5" r="2.1" fill="var(--violet-500)" />
    </svg>
  )
}

export function PlansScreen() {
  const { messages } = useI18n()
  const t = messages.billing
  const p = t.promo
  const session = useSession()
  const params = useSearchParams()

  const [interval, setInterval] = useState<Interval>('annual')
  const [currencyOverride, setCurrencyOverride] = useState<Currency | null>(
    null,
  )
  const [checkoutPlan, setCheckoutPlan] = useState<PaidPlan | null>(null)

  const currentPlan = session.data?.plan ?? 'free'
  const detected = defaultMarket(session.data?.country, session.data?.locale)
  const market: Market = currencyOverride
    ? MARKET_BY_CURRENCY[currencyOverride]
    : detected
  const currency = CURRENCY_BY_MARKET[market]
  const annual = interval === 'annual'
  const status = params.get('status')

  const per = annual ? t.perYear : t.perMonth

  function paidSub(plan: PaidPlan): string {
    if (!annual) {
      return p.billedMonthly
    }
    const eq = formatPrice(annualEquivalentMonthly(market, plan), currency)
    if (plan === 'pro') {
      const perDay = formatPrice(
        priceAmount(market, 'pro', 'annual') / 365,
        currency,
      )
      return p.perDay.replace('{eq}', eq).replace('{perDay}', perDay)
    }
    return t.eqApprox.replace('{amount}', eq)
  }

  return (
    <div className="ldp">
      <header className="ldp-header">
        <Link href="/settings" className="ldp-back">
          <span aria-hidden style={{ fontSize: 17, marginTop: -1 }}>
            &#8592;
          </span>{' '}
          {t.back}
        </Link>
        <Logo />
      </header>

      {/* hero */}
      <section className="ldp-wrap ldp-hero">
        <div className="ldp-hero-grid">
          <div className="ldp-hero-copy">
            <span className="ldp-eyebrow-pill">{p.heroBadge}</span>
            <h1 className="ldp-h1">
              {p.heroTitleTop}
              <br />
              {p.heroTitleBottom}
            </h1>
            <p className="ldp-lead">{p.heroLead}</p>
            <div className="ldp-cta-row">
              <a
                href="#planos"
                className="ldp-btn ldp-btn-primary ldp-btn-glow"
              >
                {t.subscribePlan.replace('{plan}', t.pro)}
              </a>
              <a href="#planos" className="ldp-btn ldp-btn-ghost">
                {t.seePlans}
              </a>
            </div>
            <div className="ldp-trust">
              <span className="ldp-check-mini" aria-hidden>
                &#10003;
              </span>
              {p.heroTrust}
            </div>
          </div>

          {/* phone */}
          <div className="ldp-phone-col">
            <div className="ldp-phone">
              <div className="ldp-phone-screen">
                <div className="ldp-wa-head">
                  <div className="ldp-wa-avatar">
                    <Logo size={21} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="ldp-wa-name">Lifedeck</div>
                    <div className="ldp-wa-status">{p.waStatus}</div>
                  </div>
                </div>
                <div className="ldp-wa-chat">
                  <span className="ldp-wa-daypill">{p.waToday}</span>
                  <div className="ldp-wa-in">
                    {rich(p.waBrief)}
                    <div className="ldp-wa-time">07:02</div>
                  </div>
                  <div className="ldp-wa-in">
                    {p.waBriefOffer}
                    <div className="ldp-wa-time">07:02</div>
                  </div>
                  <div className="ldp-wa-out">
                    {p.waReply}
                    <div className="ldp-wa-time">
                      07:03<span className="ldp-wa-tick">&#10003;&#10003;</span>
                    </div>
                  </div>
                </div>
                <div className="ldp-wa-bar">
                  <div className="ldp-wa-input">{p.waPlaceholder}</div>
                  <div className="ldp-wa-send" aria-hidden>
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="#fff">
                      <path d="M3 20.5v-6l9-2.5-9-2.5v-6l19 8.5z" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* plans */}
      <section
        id="planos"
        className="ldp-wrap ldp-section"
        style={{ scrollMarginTop: 20 }}
      >
        <div className="ldp-head">
          <span className="ldp-eyebrow">{p.plansEyebrow}</span>
          <h2 className="ldp-h2">{p.plansTitle}</h2>
          <p className="ldp-sub">{p.plansSub}</p>
        </div>

        {status === 'success' && (
          <div className="ldp-banner ldp-banner--ok">{t.successBanner}</div>
        )}
        {status === 'cancelled' && (
          <div className="ldp-banner ldp-banner--info">{t.cancelledBanner}</div>
        )}

        <div className="ldp-controls">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div className="ldp-seg">
              <button
                type="button"
                className={`ldp-seg-btn${!annual ? 'is-active' : ''}`}
                onClick={() => setInterval('monthly')}
              >
                {t.monthly}
              </button>
              <button
                type="button"
                className={`ldp-seg-btn${annual ? 'is-active' : ''}`}
                onClick={() => setInterval('annual')}
              >
                {t.annual}
              </button>
            </div>
            <span className="ldp-2mo">{t.annualHint}</span>
          </div>
          <div className="ldp-seg">
            <button
              type="button"
              className={`ldp-cur-btn${currency === 'BRL' ? 'is-active' : ''}`}
              onClick={() => setCurrencyOverride('BRL')}
            >
              BRL
            </button>
            <button
              type="button"
              className={`ldp-cur-btn${currency === 'USD' ? 'is-active' : ''}`}
              onClick={() => setCurrencyOverride('USD')}
            >
              USD
            </button>
          </div>
        </div>

        <div className="ldp-plans-grid">
          {/* Free */}
          <div className="ldp-card">
            <div className="ldp-plan-name">{t.free}</div>
            <div className="ldp-plan-tag">{p.tagFree}</div>
            <div className="ldp-price-row">
              <span className="ldp-price">{formatPrice(0, currency)}</span>
            </div>
            <div className="ldp-plan-sub">{p.freeForever}</div>
            {currentPlan === 'free' ? (
              <div className="ldp-plan-current">{t.yourPlanBadge}</div>
            ) : (
              <Link href="/" className="ldp-plan-cta">
                {p.freeCta}
              </Link>
            )}
            <ul className="ldp-feats ldp-feats--free">
              {p.freeBullets.map(f => (
                <li key={f} className="ldp-feat">
                  <span className="ldp-tick" aria-hidden>
                    &#10003;
                  </span>
                  {f}
                </li>
              ))}
            </ul>
          </div>

          {/* Pro */}
          <div className="ldp-card ldp-card--pro">
            <span className="ldp-reco">
              &#9733; {t.recommended.toUpperCase()}
            </span>
            <div className="ldp-plan-name ldp-plan-name--pro">{t.pro}</div>
            <div className="ldp-plan-tag">{p.tagPro}</div>
            <div className="ldp-price-row">
              <span className="ldp-price ldp-price--pro">
                {priceLabel(market, 'pro', interval)}
              </span>
              <span className="ldp-per">{per}</span>
            </div>
            <div className="ldp-plan-sub--pro">{paidSub('pro')}</div>
            {currentPlan === 'pro' ? (
              <div className="ldp-plan-current">{t.yourPlanBadge}</div>
            ) : (
              <button
                type="button"
                className="ldp-plan-cta ldp-plan-cta--pro"
                onClick={() => setCheckoutPlan('pro')}
              >
                {t.subscribePlan.replace('{plan}', t.pro)}
              </button>
            )}
            <div className="ldp-more">{p.moreThanFree}</div>
            <ul className="ldp-feats">
              {p.proBullets.map(f => (
                <li key={f} className="ldp-feat">
                  <span className="ldp-tick ldp-tick--brand" aria-hidden>
                    &#10003;
                  </span>
                  {f}
                </li>
              ))}
            </ul>
          </div>

          {/* Premium */}
          <div className="ldp-card">
            <div className="ldp-plan-name">{t.premium}</div>
            <div className="ldp-plan-tag">{p.tagPremium}</div>
            <div className="ldp-price-row">
              <span className="ldp-price">
                {priceLabel(market, 'premium', interval)}
              </span>
              <span className="ldp-per">{per}</span>
            </div>
            <div className="ldp-plan-sub">{paidSub('premium')}</div>
            {currentPlan === 'premium' ? (
              <div className="ldp-plan-current">{t.yourPlanBadge}</div>
            ) : (
              <button
                type="button"
                className="ldp-plan-cta"
                onClick={() => setCheckoutPlan('premium')}
              >
                {t.subscribePlan.replace('{plan}', t.premium)}
              </button>
            )}
            <div className="ldp-more">{p.moreThanPro}</div>
            <ul className="ldp-feats">
              {p.premiumBullets.map(f => (
                <li key={f} className="ldp-feat">
                  <span className="ldp-tick" aria-hidden>
                    &#10003;
                  </span>
                  {f}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <Showcase />
      <Comparison />
      <FaqBand />

      {/* final CTA */}
      <section className="ldp-wrap ldp-section">
        <div className="ldp-final-box">
          <h2 className="ldp-final-h">{p.finalTitle}</h2>
          <p className="ldp-final-body">
            {rich(
              p.finalBody
                .replace('{price}', `**${priceLabel(market, 'pro', interval)}`)
                .replace('{per}', `${per}**`),
            )}
          </p>
          <div className="ldp-final-ctas">
            <button
              type="button"
              className="ldp-btn ldp-btn-primary"
              onClick={() => setCheckoutPlan('pro')}
            >
              {t.subscribePlan.replace('{plan}', t.pro)}
            </button>
            <a href="#planos" className="ldp-btn ldp-btn-ghost">
              {t.compare}
            </a>
          </div>
          <div className="ldp-trust" style={{ justifyContent: 'center' }}>
            <span className="ldp-check-mini" aria-hidden>
              &#10003;
            </span>
            {p.heroTrust} · {t.footerCancel}
          </div>
        </div>
      </section>

      <footer className="ldp-footer">{p.footerLine}</footer>

      {checkoutPlan && (
        <CheckoutDialog
          plan={checkoutPlan}
          interval={interval}
          market={market}
          currency={currency}
          onClose={() => setCheckoutPlan(null)}
        />
      )}
    </div>
  )
}

function Showcase() {
  const { messages } = useI18n()
  const p = messages.billing.promo
  const slots = p.showFindSlots.split(' | ')
  const bars = [true, true, true, true, true, true, false]
  return (
    <section className="ldp-band">
      <div className="ldp-wrap ldp-section">
        <div className="ldp-head">
          <span className="ldp-eyebrow">{p.showEyebrow}</span>
          <h2 className="ldp-h2">{p.showTitle}</h2>
          <p className="ldp-sub">{p.showSub}</p>
        </div>
        <div className="ldp-show-grid">
          {/* brief */}
          <div className="ldp-show-card">
            <div className="ldp-show-head">
              <div className="ldp-show-title">{p.showBriefTitle}</div>
              <div className="ldp-show-sub">{p.showBriefSub}</div>
            </div>
            <div className="ldp-wa-panel">
              <div className="ldp-wa-in" style={{ maxWidth: '92%' }}>
                {rich(p.showBriefMsg)}
                <div className="ldp-wa-time">07:02</div>
              </div>
            </div>
          </div>

          {/* find time */}
          <div className="ldp-show-card">
            <div className="ldp-show-head">
              <div className="ldp-show-title">{p.showFindTitle}</div>
              <div className="ldp-show-sub">{p.showFindSub}</div>
            </div>
            <div className="ldp-wa-panel">
              <div className="ldp-wa-in" style={{ maxWidth: '95%' }}>
                {p.showFindMsg}
                <div className="ldp-slots">
                  {slots.map(s => (
                    <span key={s} className="ldp-slot">
                      {s}
                    </span>
                  ))}
                </div>
                <div className="ldp-wa-time">08:15</div>
              </div>
            </div>
          </div>

          {/* habit streak */}
          <div className="ldp-show-card">
            <div className="ldp-show-head">
              <div className="ldp-show-title">{p.showHabitTitle}</div>
              <div className="ldp-show-sub">{p.showHabitSub}</div>
            </div>
            <div className="ldp-streak">
              <div className="ldp-streak-row">
                <div className="ldp-flame" aria-hidden>
                  &#128293;
                </div>
                <div>
                  <div className="ldp-streak-num">
                    {p.showHabitDays.replace('{n}', '12')}
                  </div>
                  <div className="ldp-streak-meta">{p.showHabitInRow}</div>
                </div>
                <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
                  <div className="ldp-streak-name">{p.showHabitName}</div>
                  <div className="ldp-streak-today">{p.showHabitToday}</div>
                </div>
              </div>
              <div className="ldp-bars">
                {bars.map((done, i) => (
                  <div
                    key={i}
                    className={`ldp-bar ${done ? 'ldp-bar--done' : 'ldp-bar--todo'}`}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* nudge */}
          <div className="ldp-show-card">
            <div className="ldp-show-head">
              <div className="ldp-show-title">{p.showNudgeTitle}</div>
              <div className="ldp-show-sub">{p.showNudgeSub}</div>
            </div>
            <div className="ldp-wa-panel">
              <div className="ldp-nudge-card">
                <div className="ldp-nudge-body">
                  {rich(p.showNudgeMsg)}
                  <div className="ldp-wa-time">18:40</div>
                </div>
                <div className="ldp-nudge-actions">
                  <button
                    type="button"
                    className="ldp-nudge-btn ldp-nudge-btn--yes"
                  >
                    {p.showNudgeYes}
                  </button>
                  <button type="button" className="ldp-nudge-btn">
                    {p.showNudgeNo}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

// Compare-table cell renderers (module-level so they are not re-created per
// render and don't trip the static-components lint rule).
const YES = <span className="ldp-yes">&#10003;</span>
const YES_BRAND = <span className="ldp-yes--brand">&#10003;</span>
const DASH = <span className="ldp-dash">&#8212;</span>
const cellPill = (txt: string) => <span className="ldp-cell-pill">{txt}</span>
const cellBrand = (txt: string) => <span className="ldp-cell-brand">{txt}</span>
const cellMuted = (txt: string) => <span className="ldp-cell-muted">{txt}</span>
const cellInk = (txt: string) => <span className="ldp-cell-ink">{txt}</span>

function groupRow(label: string): ReactNode {
  return (
    <tr key={label} className="ldp-group">
      <td colSpan={4}>{label}</td>
    </tr>
  )
}

function featureRow(
  label: string,
  free: ReactNode,
  pro: ReactNode,
  premium: ReactNode,
): ReactNode {
  return (
    <tr key={label} className="ldp-row">
      <td className="ldp-feature-td">{label}</td>
      <td>{free}</td>
      <td>{pro}</td>
      <td>{premium}</td>
    </tr>
  )
}

function Comparison() {
  const { messages } = useI18n()
  const t = messages.billing
  const p = t.promo

  return (
    <section className="ldp-wrap ldp-section">
      <div className="ldp-head">
        <span className="ldp-eyebrow">{p.compareEyebrow}</span>
        <h2 className="ldp-h2">{p.compareTitle}</h2>
      </div>
      <div className="ldp-tablewrap">
        <table className="ldp-table">
          <thead>
            <tr>
              <th className="ldp-th-feature">{p.colFeature}</th>
              <th>{t.free}</th>
              <th className="ldp-th-pro">&#9733; {t.pro}</th>
              <th>{t.premium}</th>
            </tr>
          </thead>
          <tbody>
            {groupRow(p.groupOrg)}
            {featureRow(t.compareDailyLists, YES, YES_BRAND, YES)}
            {featureRow(t.compareSharing, YES, YES_BRAND, YES)}
            {featureRow(t.compareAnalytics, YES, YES_BRAND, YES)}
            {featureRow(t.compareAi, YES, YES_BRAND, YES)}
            {featureRow(
              t.compareHabits,
              cellMuted(p.cellOneHabit),
              cellBrand(p.cellUnlimited),
              cellInk(p.cellUnlimited),
            )}

            {groupRow(p.groupAssistant)}
            {featureRow(t.compareMemory, YES, YES_BRAND, YES)}
            {featureRow(
              t.compareAssistant,
              cellPill(p.cellSample),
              cellBrand(p.cellFull),
              cellInk(p.cellFull),
            )}
            {featureRow(t.compareBrief, DASH, YES_BRAND, YES)}
            {featureRow(t.compareReminders, DASH, YES_BRAND, YES)}
            {featureRow(p.compareCheckins, DASH, YES_BRAND, YES)}
            {featureRow(t.compareNudges, DASH, DASH, YES)}
            {featureRow(t.compareFindTime, DASH, DASH, YES)}

            {groupRow(p.groupCalendar)}
            {featureRow(t.compareCalendar, DASH, YES_BRAND, YES)}
            {featureRow(t.compareAllCalendars, DASH, DASH, YES)}

            {groupRow(p.groupAi)}
            {featureRow(t.compareStrongerAi, DASH, DASH, YES)}
            {featureRow(
              p.rowAiLimits,
              cellMuted(p.cellBasic),
              cellBrand(p.cellHigh),
              cellInk(p.cellMax),
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function FaqBand() {
  const { messages } = useI18n()
  const p = messages.billing.promo
  const cards = [
    { icon: '✓', title: p.faq1Title, body: p.faq1Body },
    { icon: '↻', title: p.faq2Title, body: p.faq2Body },
    { icon: '\u{1F512}', title: p.faq3Title, body: p.faq3Body },
    { icon: '◉', title: p.faq4Title, body: p.faq4Body },
  ]
  return (
    <section className="ldp-band-top">
      <div className="ldp-wrap ldp-section">
        <div
          className="ldp-head"
          style={{ maxWidth: '40em', margin: '0 auto 32px' }}
        >
          <span className="ldp-eyebrow">{p.faqEyebrow}</span>
          <h2 className="ldp-h2">{p.faqTitle}</h2>
        </div>
        <div className="ldp-faq-grid">
          {cards.map(c => (
            <div key={c.title} className="ldp-faq-card">
              <div className="ldp-faq-icon" aria-hidden>
                {c.icon}
              </div>
              <div className="ldp-faq-title">{c.title}</div>
              <p className="ldp-faq-body">{c.body}</p>
            </div>
          ))}
        </div>
        <div className="ldp-founder">
          <div className="ldp-founder-av" aria-hidden />
          <div className="ldp-founder-txt">{p.founderNote}</div>
        </div>
      </div>
    </section>
  )
}
