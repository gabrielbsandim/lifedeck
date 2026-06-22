# Authentication & identity

TaskIn is no-account-first: every visitor starts as a guest, and a guest can be
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
   it checks the email is free, hashes the password (`ScryptPasswordHasher`,
   scrypt + per-hash random salt, `salt:key` hex, constant-time compare), stores
   a hashed 6-digit code in `email_verifications` (15 min TTL), and emails it.
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
creates a new verified account. Requires `GOOGLE_CLIENT_ID`,
`GOOGLE_CLIENT_SECRET`, and `GOOGLE_REDIRECT_URI`.

## Account settings

`renameUser`, `changePassword` (verifies the current password first), and
`deleteUser` (DB cascade removes owned lists, tasks, recurring tasks, members,
and verification rows; assignments are nulled). Sign-out and account deletion
clear the session cookie.

## Ports (application layer)

`PasswordHasher`, `CodeGenerator`, `EmailSender`, `OAuthProvider`, and
`EmailVerificationRepository` are interfaces in `@taskin/application`, with
production adapters in `@taskin/infrastructure` and fakes in
`@taskin/application/testing` for the use-case tests.
