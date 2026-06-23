# Authentication & identity

Lifedeck is no-account-first: every visitor starts as a guest, and a guest can be
upgraded in place to a real account without losing any data. Sessions are signed
`HttpOnly` cookies (jose, HS256); the cookie holds only the user id.

## Account states

A `User` moves through three states on a single row (no data migration between
them):

| State | `isGuest` | `email` | `passwordHash` | `emailVerifiedAt` |
| --- | --- | --- | --- | --- |
| Guest | `true` | `null` | `null` | `null` |
| Email account (unverified) | `false` | set | set | `null` |
| Email account (verified) | `false` | set | set | set |
| Google account | `false` | set | `null` | set (trusted from Google) |

`User.register({ email, passwordHash, emailVerifiedAt })` performs the upgrade;
`verifyEmail(at)` and `changePassword(hash)` mutate the registered account.

## Email + password

1. `registerWithEmail(userId, { email, password })` upgrades the current guest:
   it checks the email is free, hashes the password (`Argon2PasswordHasher`,
   argon2id via `@node-rs/argon2`), stores a hashed 6-digit code in
   `email_verifications` (15 min TTL), and emails it. Legacy scrypt hashes still
   verify and are transparently re-hashed to argon2id on the next sign-in.
2. `verifyEmail(userId, { code })` checks the code is present, unexpired, and
   matches, then sets `emailVerifiedAt` and clears the verification row.
3. `signInWithEmail({ email, password })` verifies credentials and the route
   issues a fresh session cookie.

Verification codes are sent through the `EmailSender` port. In production the
adapter is `ResendEmailSender`; with no `RESEND_API_KEY` the container falls back
to `ConsoleEmailSender`, which logs the code to stdout (used for local dev and
browser verification).

## Google OAuth

`GET /api/v1/auth/google` redirects to Google with a random `state` stored in a
short-lived `HttpOnly` cookie. The callback verifies `state`, exchanges the code
through the `OAuthProvider` port (`GoogleOAuthProvider`), and then
`signInWithGoogle(code)` either returns the existing user for that email or
creates a new verified account. Requires `GOOGLE_CLIENT_ID` and
`GOOGLE_CLIENT_SECRET`; `GOOGLE_REDIRECT_URI` is optional and defaults to
`<NEXT_PUBLIC_SITE_URL>/api/v1/auth/google/callback`.

## Account settings

`renameUser`, `changePassword` (verifies the current password first),
`setCarryOverMode`, `setTimezone`, and `deleteUser` (DB cascade removes owned
lists, tasks, recurring tasks, members, and verification rows; assignments are
nulled). Sign-out and account deletion clear the session cookie. The `UserView`
exposes a `hasPassword` flag so the UI hides the change-password form for
Google-only accounts.

Profile photos are uploaded to **Vercel Blob** (`FileStorage` port,
`VercelBlobStorage` adapter): the client crops to a 256px square WebP, `POST
/api/v1/account/avatar` validates the type (PNG/JPEG/WebP) and 512 KB cap, stores
the blob, and persists its https URL on `user.avatarUrl`; `DELETE` removes it.
Replacing an avatar deletes the previous blob (best-effort). Signing in with
Google imports the profile picture as the initial avatar when present. Requires
`BLOB_READ_WRITE_TOKEN` (a no-op error otherwise).

`setTimezone` persists the user's IANA `timezone` (`PATCH
/api/v1/account/timezone`). The account dialog auto-detects the browser zone
once per account+browser and offers a manual IANA picker with a "use device
time zone" reset; a manual choice is pinned client-side and never auto-reverted.
See [recurrence.md](./recurrence.md#timezone) for how the zone drives "today".

## Ports (application layer)

`PasswordHasher`, `CodeGenerator`, `EmailSender`, `OAuthProvider`, and
`EmailVerificationRepository` are interfaces in `@lifedeck/application`, with
production adapters in `@lifedeck/infrastructure` and fakes in
`@lifedeck/application/testing` for the use-case tests.
