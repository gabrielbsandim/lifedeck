# V2 launch configuration

The V2 code is complete and dark-launched behind flags. What remains is
operational: provision credentials, then flip the flags. Set every env var in
Vercel under Project, Settings, Environment Variables, Production. The golden
rule: do step 7 (the flags) only after steps 1 to 5 are set, so no pillar goes
live without its credentials.

## 0. Migrations
Migrations 10 to 15 apply automatically on push to `main` (the `migrate.yml`
workflow). Just confirm in the Neon console that these tables exist:
`subscriptions`, `usage_events`, `calendar_events`, `calendar_connections`,
`channel_identities`, `scheduled_jobs`. (Migration 16 applies once the
pagination work is committed.)

## 1. Base (do first, unblocks the rest)
- Upstash Redis: console.upstash.com, create a Redis database, copy the REST URL
  and token.
  - `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`
- Generated secrets (run `openssl rand -hex 32` once per value):
  - `CRON_SECRET`, `CALENDAR_TOKEN_KEY`
- Gemini: aistudio.google.com/apikey, create a key.
  - `GEMINI_API_KEY` (optional `GEMINI_PRO_MODEL_ID`, e.g. `gemini-3-pro-preview`)

## 2. Billing, Stripe (international)
1. dashboard.stripe.com: create Pro and Premium products with monthly and annual
   prices (USD).
2. Developers, Webhooks, add endpoint
   `https://www.lifedeck.com.br/api/v1/webhooks/stripe`, subscribe to
   subscription events.
3. Set: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_*` (one per
   plan and interval).

## 3. Billing, Asaas (Brazil)
1. asaas.com: account, get the API key.
2. Webhooks: URL `https://www.lifedeck.com.br/api/v1/webhooks/asaas`, set a token.
3. Set: `ASAAS_API_KEY`, `ASAAS_WEBHOOK_TOKEN`, `ASAAS_PRICE_*`.

## 4. WhatsApp, Meta Cloud API
1. developers.facebook.com: app, add the WhatsApp product.
2. Get the Phone Number ID and Access Token; App Settings has the App Secret.
3. Webhook: URL `https://www.lifedeck.com.br/api/v1/webhooks/whatsapp`, verify
   token is a value you choose (used in the handshake).
4. Create and get one utility template approved (event reminder).
5. Set: `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_ACCESS_TOKEN`,
   `WHATSAPP_APP_SECRET`, `WHATSAPP_VERIFY_TOKEN`, `WHATSAPP_REMINDER_TEMPLATE`,
   `WHATSAPP_TEMPLATE_LANGUAGE` (e.g. `pt_BR`).

## 5. Google Calendar (reuses the existing Google OAuth)
1. console.cloud.google.com: your project, enable the Google Calendar API.
2. OAuth consent screen: add the calendar scopes.
3. Credentials: add redirect URI
   `https://www.lifedeck.com.br/api/v1/calendar/google/callback`.
4. Set: `GOOGLE_CALENDAR_REDIRECT_URI` (the URI above),
   `GOOGLE_CALENDAR_WEBHOOK_TOKEN` (`openssl rand -hex 16`).

## 6. Cron
Already defined in `apps/web/vercel.json` (`dispatch-jobs` every minute,
`fan-out-jobs` every 15 minutes). Nothing to create; just make sure
`CRON_SECRET` from step 1 is set.

## 7. Turn V2 on (last)
1. Set the flags: `FEATURES_V2=true` (master gate) plus `FEATURE_CALENDAR=true`,
   `FEATURE_WHATSAPP=true`, `FEATURE_BILLING=true`.
2. Redeploy (Vercel only applies new env on the next deploy).
3. Smoke test: connect Google on `/calendar`, pair your WhatsApp number and send
   a message, open `/settings/billing`.

To roll out gradually, enable `FEATURES_V2` plus one `FEATURE_*` at a time.
