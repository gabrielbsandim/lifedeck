# Security

TaskIn holds personal planning data and exposes a public, white-label API.
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
- **Sessions:** signed JWT stored in an `HttpOnly`, `Secure`, `SameSite=Lax`
  cookie. Tokens are short-lived and refreshed server-side.

## Authorization

- List access is resolved through `ListMember` rows (`owner`, `editor`, `viewer`).
- Public links (`ShareLink`) grant a capped role and can carry an expiry.
- Item-level visibility lets a user keep specific daily-list items private even on
  a shared list.

## Transport and platform

- HTTPS only; HSTS enabled in production.
- Security headers: `Content-Security-Policy`, `X-Content-Type-Options`,
  `Referrer-Policy`, `X-Frame-Options: DENY`.
- Rate limiting on auth and write endpoints (`API_RATE_LIMIT_PER_MINUTE`).
- CORS is allow-listed via `API_ALLOWED_ORIGINS`.

## Data protection

- Secrets live only in environment variables, never in the repository.
- Database access goes through Prisma parameterized queries (no string SQL).
- Personal data export and deletion are planned to support user data rights.

## Known follow-ups

- The `/docs` page currently loads Scalar from a pinned CDN URL. Before production
  it should be self-hosted (bundled from the npm package) or pinned with a
  Subresource Integrity hash to remove the third-party runtime dependency.
- Add automated dependency scanning and `pnpm audit` to CI.

## Reporting a vulnerability

Please open a private security advisory on GitHub rather than a public issue.
