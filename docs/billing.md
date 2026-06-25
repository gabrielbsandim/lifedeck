# Billing and subscriptions

Status: implemented (V2-3). Two payment gateways behind a single port, routed by
market: Asaas in Brazil (native Pix, boleto, card, NF-e) and Stripe
internationally (USD). The feature is flag-gated behind `FEATURE_BILLING` (and the
master `FEATURES_V2`). The signed webhooks are the source of truth for subscription
state; the client redirect is never trusted. This page records the entities, the
port, the gateways, entitlement resolution, and the env vars.

## Domain

- `Subscription` (`packages/domain/src/entities/subscription.ts`): `userId`, `plan`,
  `status`, `provider`, `providerRef`, `currentPeriodEnd`. `isActive(now)` gates
  entitlement resolution.
- `SubscriptionStatus` (`packages/domain/src/value-objects/subscription-status.ts`):
  `trialing` | `active` | `past_due` | `canceled`.
- `PaymentProvider` (`packages/domain/src/value-objects/payment-provider.ts`):
  `asaas` | `stripe`.
- `Plan` (`packages/domain/src/value-objects/plan.ts`): `free` | `pro` | `premium`,
  config not a table. It holds the catalog (entitlements plus the 5-hour and weekly
  credit quota per plan) via the pure functions `entitlementsForPlan`, `planGrants`,
  and `quotaForPlan`. `Entitlement`
  (`packages/domain/src/value-objects/entitlement.ts`): `calendarSync`,
  `whatsappAssistant`, `premiumModel`.

The plan catalog: free grants `whatsappAssistant` (a taster), pro adds
`calendarSync`, premium adds `premiumModel`.

## Application

`PaymentGateway` (`packages/application/src/ports/payment-gateway.ts`) is the single
abstraction over both gateways: `startCheckout(input)` and
`parseWebhook(rawBody, signature)`, plus a `provider` tag. A webhook normalizes into
a `SubscriptionEvent` (`providerRef`, `userId`, `plan`, `status`,
`currentPeriodEnd`), so the use cases never know which gateway served a charge.
`SubscriptionRepository`
(`packages/application/src/ports/subscription-repository.ts`): `save`, `findByUser`,
`findByProviderRef`.

Use cases (`packages/application/src/use-cases/`):

- `startCheckout` routes by market via `gatewayForMarket(market)` (`BR` selects
  Asaas, otherwise Stripe). Routing is decided once at checkout, not per charge.
- `handleSubscriptionWebhook` parses the provider event and does an idempotent
  create or update of the subscription. When the event carries a reference (Asaas,
  whose webhook is only token-authenticated), a subscription is created only if that
  reference matches a `CheckoutIntent` persisted at checkout time, so a forged event
  cannot grant a plan to an arbitrary user. Stripe events carry no reference and stay
  trusted by their signature.
- `resolvePlanFromSubscription` returns the active subscription's plan, falling back
  to the default `free` plan.

(There is no separate `changePlan` or `cancelSubscription` use case; plan changes go
through a new checkout, and cancellations arrive via the webhook.)

## Gateways

- `AsaasPaymentGateway` (`packages/infrastructure/src/billing/asaas-payment-gateway.ts`):
  a hosted recurrent payment link (`POST /v3/paymentLinks`, `billingType: UNDEFINED`
  so the customer picks Pix, card, or boleto). `externalReference` carries
  `userId|plan|interval`. The webhook is authenticated by an `asaas-access-token`
  header (timing-safe compare), maps `PAYMENT_*` / `SUBSCRIPTION_DELETED` events
  onto the normalized shape, and echoes the `externalReference` back so the handler
  can cross-check it against a stored `CheckoutIntent`.
- `StripePaymentGateway` (`packages/infrastructure/src/billing/stripe-payment-gateway.ts`):
  a Checkout Session (`mode: subscription`), with `userId` and `plan` carried in the
  subscription metadata. The webhook is verified with an HMAC-SHA256 signature over
  the raw body. Both webhooks are idempotent.

## Entitlement resolution

`EntitlementService` (`packages/application/src/ports/entitlement-service.ts`,
`for(userId)`) returns the user's plan plus its entitlements. The implementation
`PlanEntitlementService`
(`packages/infrastructure/src/entitlements/plan-entitlement-service.ts`) takes a
`PlanResolver`, wired in the container to `resolvePlanFromSubscription`, so real
entitlements flow from the active subscription. The same data surfaces on the client
through the session, and `requireFeature` / `requireEntitlement` guards sit alongside
`requireScope` in the route handlers.

## Credit metering

AI usage is metered in cost-weighted credits across two rolling windows: a 5-hour
window and a weekly window. Each operation has a credit weight in
`packages/domain/src/value-objects/ai-operation.ts` (`assistantText` and
`listGeneration` = 1, `audioTranscription` and `imageVision` = 2, `assistantPro`
= 6). `consumeCredits` (`packages/application/src/use-cases/consume-credits.ts`)
resolves the plan quota and calls `UsageMeter.consume(userId, credits, limits)`.

The Upstash implementation (`packages/infrastructure/src/usage/redis-usage-meter.ts`)
runs the check-and-add atomically in a single Redis `EVAL` Lua script: it trims both
windows by score, sums the remaining credits, and only `ZADD`s the new charge when
neither window would exceed its limit. This closes the check-then-add race, so two
concurrent requests near the cap cannot both pass. When a window is full the use
case throws `QuotaExceededError`, which the API maps to HTTP `429`; the WhatsApp
assistant turns it into a friendly "limit reached" reply. Without Upstash the meter
is a no-op (everything allowed), which is the local-dev default.

## Plans and prices

| Plan | Entitlements added | 5-hour / weekly credits |
| ---- | ------------------ | ----------------------- |
| Free | `whatsappAssistant` | 5 / 15 |
| Pro | `calendarSync` | 40 / 200 |
| Premium | `premiumModel` | 80 / 500 |

Prices are not in the pure domain; gateway price refs live in env (per plan and
interval, monthly or annual).

## REST routes

Under `apps/web/src/app/api/v1/`, all `billing`-flag gated:

- `billing/checkout` (POST): body `{ plan, interval, market }`, session-auth,
  returns a `CheckoutSession` (`{ url }`). Market routing happens here.
- `webhooks/stripe` (POST): verified by the `stripe-signature` header.
- `webhooks/asaas` (POST): verified by the `asaas-access-token` header.

## Env vars

Asaas: `ASAAS_BASE_URL`, `ASAAS_API_KEY`, `ASAAS_WEBHOOK_TOKEN`,
`ASAAS_VALUE_PRO_MONTHLY`, `ASAAS_VALUE_PRO_ANNUAL`, `ASAAS_VALUE_PREMIUM_MONTHLY`,
`ASAAS_VALUE_PREMIUM_ANNUAL`.

Stripe: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_PRO_MONTHLY`,
`STRIPE_PRICE_PRO_ANNUAL`, `STRIPE_PRICE_PREMIUM_MONTHLY`,
`STRIPE_PRICE_PREMIUM_ANNUAL`.

Flag: `FEATURE_BILLING`.
