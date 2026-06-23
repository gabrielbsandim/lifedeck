# Security

Lifedeck holds personal planning data and exposes a public, white-label API.
Security is a first-class requirement, not a later hardening pass.

## Principles

- **Least privilege.** Every query is scoped to the authenticated principal. A
  user can only read or mutate lists they own or were explicitly granted.
- **Validate at the edge.** Every request body and query parameter is parsed with
  Zod before it reaches a use case. Unparsed input never touches the domain.
- **Fail closed.** Authorization defaults to deny. Sharing is opt-in per list and,
  for the daily list, per item.
- **No secret leakage.** Internal errors return a generic message and a stable
  code; stack traces and provider errors are never sent to clients.

## Authentication

- **Guest:** a display name creates a guest user. No credentials, scoped session.
- **Registered:** email + password with an email verification code, or Google
  OAuth. Passwords are hashed with a memory-hard algorithm (Argon2id).
- **Sessions (web):** signed JWT stored in an `HttpOnly`, `Secure`,
  `SameSite=Lax` cookie. Tokens are short-lived and refreshed server-side.
- **Sessions (non-web clients):** the white-label API authenticates with a
  personal **API key** (`Authorization: Bearer tk_live_...` or `X-API-Key`).
  Keys are scoped, the raw secret is shown once and stored only as a SHA-256
  hash, and each key is rate limited independently.
- **Password migration:** existing scrypt hashes are verified on sign-in and
  transparently re-hashed to Argon2id on the next successful login.
- **Brute-force protection:** sign-in, register, verify, and resend-code are
  rate limited per IP + identity (Upstash, stricter than the API window).

## Authorization

- List access is resolved through `ListMember` rows (`owner`, `editor`, `viewer`).
- Public links (`ShareLink`) grant a capped role and can carry an expiry.
  Reading or joining via a share token additionally requires the list's
  `visibility` to be `link` (fail-closed), so making a list private invalidates
  outstanding tokens.
- Item-level visibility lets a user keep specific daily-list items private even on
  a shared list.

## Transport and platform

- HTTPS only; HSTS enabled in production.
- Security headers: a strict **nonce-based** `Content-Security-Policy`
  (`script-src 'self' 'nonce' 'strict-dynamic'`, no `unsafe-inline` scripts)
  set per request in `proxy.ts`, plus `X-Content-Type-Options: nosniff`,
  `Referrer-Policy`, `X-Frame-Options: DENY`, and a minimal `Permissions-Policy`.
- The Scalar API reference is self-hosted (vendored into `public/scalar` at
  build time), so the CSP needs no external script origin.
- Per-key rate limiting on the API, per-user rate limiting on first-party
  cookie traffic (with a tight per-user throttle on AI list generation), and
  per-IP rate limiting on auth endpoints, backed by Upstash Redis (a graceful
  no-op when unconfigured).

## Data protection

- Secrets live only in environment variables, never in the repository.
- Database access goes through Prisma parameterized queries (no string SQL).
- **Data rights:** `GET /api/v1/account/export` returns a JSON copy of all of a
  user's data; account deletion cascades to every owned record.

## Supply chain

- CI runs `pnpm audit --prod` and `actions/dependency-review-action` on PRs.
- A CodeQL workflow (security-extended queries) scans on push, PR, and weekly.

## Known follow-ups

- CORS allow-listing for the public API is not yet configured.
- Scheduled delivery (Vercel Cron) for the daily digest is not yet wired.

## Reporting a vulnerability

Please open a private security advisory on GitHub rather than a public issue.
