# Configuração de ambiente (Lifedeck)

Guia direto do que configurar e onde obter cada valor. Copie `.env.example` para
`.env` e preencha. Nunca faça commit do `.env` real.

Convenção: features cujas chaves não estão setadas degradam em silêncio (viram
no-op ou stub), exceto as marcadas **obrigatórias**.

## Obrigatórias

| Variável | O que é | Onde pegar |
| --- | --- | --- |
| `NODE_ENV` | Ambiente (`development` / `production`). | Você define. Em produção use `production`. |
| `DATABASE_URL` | Postgres pooled (runtime). | Neon → projeto → Connection Details → string **Pooled**. |
| `DATABASE_URL_UNPOOLED` | Postgres direto (Prisma Migrate). | Neon → mesma tela → string **Direct/Unpooled**. |
| `AUTH_SECRET` | Segredo de assinatura do JWT de sessão. | Gere local: `openssl rand -base64 48`. |
| `NEXT_PUBLIC_SITE_URL` | Origem pública canônica (links de share/email/OAuth, OpenAPI). | Sua URL final (ex.: `https://lifedeck.com.br`). Em dev, `http://localhost:3000`. |

## Login com Google (opcional)

Console: https://console.cloud.google.com → APIs e Serviços → Credenciais →
"Criar credenciais" → ID do cliente OAuth (tipo: Aplicativo da Web).

| Variável | O que é | Onde pegar |
| --- | --- | --- |
| `GOOGLE_CLIENT_ID` | Client ID OAuth. | Tela de Credenciais (mesmo client serve para login e calendário). |
| `GOOGLE_CLIENT_SECRET` | Client secret OAuth. | Mesma tela. |
| `GOOGLE_REDIRECT_URI` | Callback de login. Default: `<SITE_URL>/api/v1/auth/google/callback`. | Registre essa URL em "URIs de redirecionamento autorizados". |

## E-mail (Resend, opcional)

Console: https://resend.com → API Keys (chave) e Domains (verificar domínio
DNS: SPF/DKIM/DMARC). Sem `RESEND_API_KEY`, e-mails só vão para o console.

| Variável | O que é | Onde pegar |
| --- | --- | --- |
| `RESEND_API_KEY` | Chave da API. | Resend → API Keys → Create. |
| `EMAIL_FROM` | Remetente. Precisa estar em domínio verificado. | Defina, ex.: `"Lifedeck <contato@lifedeck.com.br>"`. |

## IA / geração de listas (opcional)

Ordem de resolução: `GEMINI_API_KEY` (Gemini direto) > `AI_MODEL` (Vercel AI
Gateway) > stub offline.

| Variável | O que é | Onde pegar |
| --- | --- | --- |
| `GEMINI_API_KEY` | Chave Gemini direta. | https://aistudio.google.com/apikey → Create API key. |
| `GEMINI_MODEL_ID` | Modelo flash padrão. | Opcional. Default `gemini-2.5-flash`. |
| `AI_MODEL` | Modelo via Vercel AI Gateway (fallback). | Vercel → AI Gateway. Ex.: `google/gemini-2.5-flash`. |
| `AI_GATEWAY_API_KEY` | Chave do AI Gateway. | Vercel → AI Gateway → API Keys. |

## Avatares (Vercel Blob, opcional)

| Variável | O que é | Onde pegar |
| --- | --- | --- |
| `BLOB_READ_WRITE_TOKEN` | Token de leitura/escrita do Blob. | Vercel → Storage → criar Blob store → token. Auto-injetado em deploy na Vercel. |

## Rate limit / cache / metering (Upstash Redis, opcional)

Sem essas chaves: rate limit, dedup do WhatsApp, histórico de conversa e
medição de créditos viram no-op.

| Variável | O que é | Onde pegar |
| --- | --- | --- |
| `UPSTASH_REDIS_REST_URL` | URL REST do Redis. | https://console.upstash.com → criar database Redis → REST API → URL. |
| `UPSTASH_REDIS_REST_TOKEN` | Token REST. | Mesma tela → REST API → Token. |

## Monitoramento de erros (Sentry, opcional)

| Variável | O que é | Onde pegar |
| --- | --- | --- |
| `SENTRY_DSN` | DSN server-side. | https://sentry.io → projeto → Settings → Client Keys (DSN). |
| `NEXT_PUBLIC_SENTRY_DSN` | DSN client-side. | Mesmo DSN. |

## V2: flags de feature (opcional)

Tudo do V2 fica invisível em produção até ligar. `true` habilita.

| Variável | O que é |
| --- | --- |
| `FEATURES_V2` | Chave-mestra de todos os pilares V2. |
| `FEATURE_BILLING` | Liga planos pagos/checkout. |
| `FEATURE_CALENDAR` | Liga sincronização de calendário. |
| `FEATURE_WHATSAPP` | Liga o assistente de WhatsApp. |

## Cron / jobs em background

| Variável | O que é | Onde pegar |
| --- | --- | --- |
| `CRON_SECRET` | Bearer que autoriza os endpoints internos de cron. | Gere: `openssl rand -base64 32`. Na Vercel, o cron já envia `Authorization: Bearer ${CRON_SECRET}` quando setado. |

Agendamentos já estão em `apps/web/vercel.json` (dispatch a cada minuto, fan-out
a cada 15 min). Alternativa: apontar um QStash para os mesmos endpoints.

## Billing - Asaas (Brasil: Pix, cartão, boleto)

Console: https://www.asaas.com (use sandbox primeiro:
`https://sandbox.asaas.com/api`). Valores em BRL.

| Variável | O que é | Onde pegar |
| --- | --- | --- |
| `ASAAS_BASE_URL` | Base da API (sandbox ou produção). | Defina. Sandbox: `https://sandbox.asaas.com/api`. |
| `ASAAS_API_KEY` | Chave da API. | Asaas → Integrações → Chave de API. |
| `ASAAS_WEBHOOK_TOKEN` | Token que valida o webhook. | Você define no Asaas → Webhooks (header `asaas-access-token`). |
| `ASAAS_VALUE_PRO_MONTHLY` | Preço Pro mensal (BRL). | Você define. Ex.: `14.90`. |
| `ASAAS_VALUE_PRO_ANNUAL` | Preço Pro anual (BRL). | Você define. Ex.: `149.00`. |
| `ASAAS_VALUE_PREMIUM_MONTHLY` | Preço Premium mensal (BRL). | Você define. Ex.: `29.90`. |
| `ASAAS_VALUE_PREMIUM_ANNUAL` | Preço Premium anual (BRL). | Você define. Ex.: `299.00`. |

## Billing - Stripe (internacional, USD)

Console: https://dashboard.stripe.com. Crie os Products/Prices e copie os Price IDs.

| Variável | O que é | Onde pegar |
| --- | --- | --- |
| `STRIPE_SECRET_KEY` | Chave secreta. | Stripe → Developers → API keys → Secret key. |
| `STRIPE_WEBHOOK_SECRET` | Segredo do endpoint de webhook. | Stripe → Developers → Webhooks → seu endpoint → Signing secret. |
| `STRIPE_PRICE_PRO_MONTHLY` | Price ID Pro mensal. | Stripe → Products → Price → ID (`price_...`). |
| `STRIPE_PRICE_PRO_ANNUAL` | Price ID Pro anual. | Idem. |
| `STRIPE_PRICE_PREMIUM_MONTHLY` | Price ID Premium mensal. | Idem. |
| `STRIPE_PRICE_PREMIUM_ANNUAL` | Price ID Premium anual. | Idem. |

## Calendário - Google sync (`FEATURE_CALENDAR`)

Reusa `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` do login. Habilite a **Google
Calendar API** no projeto (Console → APIs e Serviços → Biblioteca).

| Variável | O que é | Onde pegar |
| --- | --- | --- |
| `GOOGLE_CALENDAR_REDIRECT_URI` | Callback OAuth do calendário. | Registre em Credenciais: `<SITE_URL>/api/v1/calendar/google/callback`. |
| `GOOGLE_CALENDAR_WEBHOOK_TOKEN` | Segredo opcional do canal de watch (header `X-Goog-Channel-Token`). | Você define. Gere um aleatório. |
| `CALENDAR_TOKEN_KEY` | Chave AES-256-GCM que cifra os tokens OAuth no banco. **Obrigatória em produção** (sem ela, o app falha em vez de salvar em texto puro). | Gere: `openssl rand -base64 32`. |

## WhatsApp - Meta Cloud API (`FEATURE_WHATSAPP`)

Console: https://developers.facebook.com → seu App → WhatsApp → API Setup.
Verificação do negócio (Meta Business) + templates utilitários aprovados são
necessários para produção.

| Variável | O que é | Onde pegar |
| --- | --- | --- |
| `WHATSAPP_PHONE_NUMBER_ID` | ID do número de origem. | WhatsApp → API Setup → Phone number ID. |
| `WHATSAPP_ACCESS_TOKEN` | Token de envio (permanente/System User). | Meta App → WhatsApp → token (use System User para não expirar). |
| `WHATSAPP_APP_SECRET` | App Secret (valida assinatura do webhook). | Meta App → Settings → Basic → App Secret. |
| `WHATSAPP_VERIFY_TOKEN` | Token do handshake GET do webhook. | Você define; cole o mesmo na config do webhook na Meta. |
| `WHATSAPP_REMINDER_TEMPLATE` | Nome do template utilitário de lembrete. | Meta → WhatsApp Manager → Message Templates (aprovado). Sem isso, lembrete só in-app. |
| `WHATSAPP_TEMPLATE_LANGUAGE` | Idioma do template. | Ex.: `pt_BR`. |
| `GEMINI_PRO_MODEL_ID` | Modelo Pro para texto longo (tier Premium; reusa `GEMINI_API_KEY`). | Opcional. Default `gemini-3-pro-preview`. |

## Checklist de go-live do V2

1. Setar `CALENDAR_TOKEN_KEY` e `CRON_SECRET` em produção.
2. Configurar provedores externos: Google Cloud (OAuth + Calendar API), Meta
   WhatsApp (verificação + templates), Stripe e/ou Asaas (chaves de produção),
   Upstash Redis.
3. Verificar domínio de e-mail no Resend e setar `EMAIL_FROM`.
4. Ligar as flags: `FEATURES_V2` + `FEATURE_CALENDAR` / `FEATURE_WHATSAPP` /
   `FEATURE_BILLING` conforme o pilar a lançar.
5. Confirmar o cron (Vercel Cron já em `vercel.json`, ou QStash).
