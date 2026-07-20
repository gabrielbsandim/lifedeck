# Environment configuration (Lifedeck)

A direct guide to what to configure and where to get each value. Copy
`.env.example` to `.env` and fill it in. Never commit the real `.env`.

Convention: features whose keys are not set degrade silently (they become a
no-op or a stub), except the ones marked **required**.

## Required

| Variable | What it is | Where to get it |
| --- | --- | --- |
| `NODE_ENV` | Environment (`development` / `production`). | You set it. Use `production` in production. |
| `DATABASE_URL` | Pooled Postgres (runtime). | Neon → project → Connection Details → **Pooled** string. |
| `DATABASE_URL_UNPOOLED` | Direct Postgres (Prisma Migrate). | Neon → same screen → **Direct/Unpooled** string. |
| `AUTH_SECRET` | Signing secret for the session JWT. | Generate locally: `openssl rand -base64 48`. |
| `NEXT_PUBLIC_SITE_URL` | Canonical public origin (share/email/OAuth links, OpenAPI). | Your final URL (e.g. `https://lifedeck.com.br`). In dev, `http://localhost:3000`. |

## Sign in with Google (optional)

Console: https://console.cloud.google.com → APIs & Services → Credentials →
"Create credentials" → OAuth client ID (type: Web application).

| Variable | What it is | Where to get it |
| --- | --- | --- |
| `GOOGLE_CLIENT_ID` | OAuth client ID. | Credentials screen (the same client works for login and calendar). |
| `GOOGLE_CLIENT_SECRET` | OAuth client secret. | Same screen. |
| `GOOGLE_REDIRECT_URI` | Login callback. Default: `<SITE_URL>/api/v1/auth/google/callback`. | Register this URL under "Authorized redirect URIs". |

## Email (Resend, optional)

Console: https://resend.com → API Keys (key) and Domains (verify domain DNS:
SPF/DKIM/DMARC). Without `RESEND_API_KEY`, emails only go to the console.

| Variable | What it is | Where to get it |
| --- | --- | --- |
| `RESEND_API_KEY` | API key. | Resend → API Keys → Create. |
| `EMAIL_FROM` | Sender. Must be on a verified domain. | Set it, e.g. `"Lifedeck <contato@lifedeck.com.br>"`. |

## AI / list generation (optional)

Resolution order: `GEMINI_API_KEY` (direct Gemini) > `AI_MODEL` (Vercel AI
Gateway) > offline stub.

| Variable | What it is | Where to get it |
| --- | --- | --- |
| `GEMINI_API_KEY` | Direct Gemini key. | https://aistudio.google.com/apikey → Create API key. |
| `GEMINI_MODEL_ID` | Default flash model. | Optional. Default `gemini-2.5-flash`. |
| `AI_MODEL` | Model via Vercel AI Gateway (fallback). | Vercel → AI Gateway. E.g. `google/gemini-2.5-flash`. |
| `AI_GATEWAY_API_KEY` | AI Gateway key. | Vercel → AI Gateway → API Keys. |

## Avatars (Vercel Blob, optional)

| Variable | What it is | Where to get it |
| --- | --- | --- |
| `BLOB_READ_WRITE_TOKEN` | Blob read/write token. | Vercel → Storage → create Blob store → token. Auto-injected on Vercel deploys. |

## Rate limit / cache / metering (Upstash Redis, optional)

Without these keys: rate limiting, WhatsApp dedup, conversation history, and
credit metering become a no-op.

| Variable | What it is | Where to get it |
| --- | --- | --- |
| `UPSTASH_REDIS_REST_URL` | Redis REST URL. | https://console.upstash.com → create Redis database → REST API → URL. |
| `UPSTASH_REDIS_REST_TOKEN` | REST token. | Same screen → REST API → Token. |

## Error monitoring (Sentry, optional)

| Variable | What it is | Where to get it |
| --- | --- | --- |
| `SENTRY_DSN` | Server-side DSN. | https://sentry.io → project → Settings → Client Keys (DSN). |
| `NEXT_PUBLIC_SENTRY_DSN` | Client-side DSN. | Same DSN. |

## V2: feature flags (optional)

Everything in V2 stays invisible in production until turned on. `true` enables it.

| Variable | What it is |
| --- | --- |
| `FEATURES_V2` | Master switch for all V2 pillars. |
| `FEATURE_BILLING` | Enables paid plans/checkout. |
| `FEATURE_CALENDAR` | Enables calendar sync. |
| `FEATURE_WHATSAPP` | Enables the WhatsApp assistant. |

## Cron / background jobs

| Variable | What it is | Where to get it |
| --- | --- | --- |
| `CRON_SECRET` | Bearer that authorizes the internal cron endpoints. | Generate: `openssl rand -base64 32`. On Vercel, cron already sends `Authorization: Bearer ${CRON_SECRET}` when set. |

Schedules are already in `apps/web/vercel.json` (dispatch every 15 min, fan-out
hourly). Alternative: point a QStash at the same endpoints.

| Variable | What it is | Where to get it |
| --- | --- | --- |
| `QSTASH_TOKEN` | Authorizes best-effort "wake" calls that trigger the dispatcher right when a job is due, instead of waiting for the next cron sweep. Optional — the cron fallback drains the outbox regardless. | Upstash QStash console. |
| `QSTASH_URL` | QStash publish endpoint, matched to your region. | Upstash QStash console. |

## Billing - Asaas (Brazil: Pix, card, boleto)

Console: https://www.asaas.com (use sandbox first:
`https://sandbox.asaas.com/api`). Values in BRL.

| Variable | What it is | Where to get it |
| --- | --- | --- |
| `ASAAS_BASE_URL` | API base (sandbox or production). | Set it. Sandbox: `https://sandbox.asaas.com/api`. |
| `ASAAS_API_KEY` | API key. | Asaas → Integrations → API Key. |
| `ASAAS_WEBHOOK_TOKEN` | Token that validates the webhook. | You set it in Asaas → Webhooks (header `asaas-access-token`). |
| `ASAAS_VALUE_PRO_MONTHLY` | Pro monthly price (BRL). | You set it. E.g. `14.90`. |
| `ASAAS_VALUE_PRO_ANNUAL` | Pro annual price (BRL). | You set it. E.g. `149.00`. |
| `ASAAS_VALUE_PREMIUM_MONTHLY` | Premium monthly price (BRL). | You set it. E.g. `29.90`. |
| `ASAAS_VALUE_PREMIUM_ANNUAL` | Premium annual price (BRL). | You set it. E.g. `299.00`. |

## Billing - Stripe (international, USD)

Console: https://dashboard.stripe.com. Create the Products/Prices and copy the Price IDs.

| Variable | What it is | Where to get it |
| --- | --- | --- |
| `STRIPE_SECRET_KEY` | Secret key. | Stripe → Developers → API keys → Secret key. |
| `STRIPE_WEBHOOK_SECRET` | Webhook endpoint secret. | Stripe → Developers → Webhooks → your endpoint → Signing secret. |
| `STRIPE_PRICE_PRO_MONTHLY` | Pro monthly Price ID. | Stripe → Products → Price → ID (`price_...`). |
| `STRIPE_PRICE_PRO_ANNUAL` | Pro annual Price ID. | Same. |
| `STRIPE_PRICE_PREMIUM_MONTHLY` | Premium monthly Price ID. | Same. |
| `STRIPE_PRICE_PREMIUM_ANNUAL` | Premium annual Price ID. | Same. |

## Calendar - Google sync (`FEATURE_CALENDAR`)

Reuses `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` from login. Enable the **Google
Calendar API** in the project (Console → APIs & Services → Library).

| Variable | What it is | Where to get it |
| --- | --- | --- |
| `GOOGLE_CALENDAR_REDIRECT_URI` | Calendar OAuth callback. | Register under Credentials: `<SITE_URL>/api/v1/calendar/google/callback`. |
| `GOOGLE_CALENDAR_WEBHOOK_TOKEN` | Optional watch-channel secret (header `X-Goog-Channel-Token`). | You set it. Generate a random one. |
| `CALENDAR_TOKEN_KEY` | AES-256-GCM key that encrypts the OAuth tokens in the database. **Required in production** (without it, the app fails instead of storing them in plaintext). | Generate: `openssl rand -base64 32`. |

## WhatsApp - Meta Cloud API (`FEATURE_WHATSAPP`)

Console: https://developers.facebook.com → your App → WhatsApp → API Setup.
Business verification (Meta Business) + approved utility templates are required
for production.

| Variable | What it is | Where to get it |
| --- | --- | --- |
| `WHATSAPP_PHONE_NUMBER_ID` | Source number ID. | WhatsApp → API Setup → Phone number ID. |
| `WHATSAPP_ACCESS_TOKEN` | Send token (permanent/System User). | Meta App → WhatsApp → token (use a System User so it doesn't expire). |
| `WHATSAPP_APP_SECRET` | App Secret (validates the webhook signature). | Meta App → Settings → Basic → App Secret. |
| `WHATSAPP_VERIFY_TOKEN` | Token for the webhook GET handshake. | You set it; paste the same value into the webhook config on Meta. |
| `WHATSAPP_REMINDER_TEMPLATE` | Name of the utility reminder template. | Meta → WhatsApp Manager → Message Templates (approved). Without it, reminders are in-app only. |
| `WHATSAPP_TEMPLATE_LANGUAGE` | Template language. | E.g. `pt_BR`. |
| `GEMINI_PRO_MODEL_ID` | Pro model for long text (Premium tier; reuses `GEMINI_API_KEY`). | Optional. Default `gemini-3-pro-preview`. |

### WhatsApp via Abracode gateway (alternative transport)

When these are set, the Abracode gateway is used instead of talking to Meta
directly (it manages the access token; you only need an API key). Abracode
**takes precedence** over the Meta-direct vars above.

| Variable | What it is | Where to get it |
| --- | --- | --- |
| `ABRACODE_API_KEY` | Abracode API key (`wpk_live_…` / `wpk_test_…`). | Abracode dashboard. |
| `ABRACODE_FROM` | Abracode PhoneNumber record id (from `GET /v1/numbers`), not the E.164. | Abracode dashboard. |
| `ABRACODE_BASE_URL` | Optional API base URL. | Defaults to `https://api.abracode.com.br`. |
| `ABRACODE_PHONE_NUMBER_ID` | Meta phone-number id, only needed to resolve inbound media. | Meta → WhatsApp → API Setup. |
| `ABRACODE_WEBHOOK_SECRET` | Validates the inbound Abracode webhook. | You set it; paste the same value into Abracode. |

## V2 go-live checklist

1. Set `CALENDAR_TOKEN_KEY` and `CRON_SECRET` in production.
2. Configure external providers: Google Cloud (OAuth + Calendar API), Meta
   WhatsApp (verification + templates), Stripe and/or Asaas (production keys),
   Upstash Redis.
3. Verify the email domain in Resend and set `EMAIL_FROM`.
4. Turn on the flags: `FEATURES_V2` + `FEATURE_CALENDAR` / `FEATURE_WHATSAPP` /
   `FEATURE_BILLING` depending on the pillar you are launching.
5. Confirm the cron (Vercel Cron already in `vercel.json`, or QStash).
