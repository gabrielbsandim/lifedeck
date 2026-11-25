# Authentication & identity

Lifedeck is no-account-first: every visitor starts as a guest, and a guest can be
upgraded in place to a real account without losing any data. Sessions are signed
`HttpOnly` cookies (jose, HS256); the cookie holds only the user id and the
issue time, and native apps send the same JWT as a Bearer token.

### Session revocation

`users.sessions_valid_from` marks every token issued before it as dead.
Changing the password sets it (the route answers with a fresh `{ data, token }`
and cookie so the caller stays signed in), and so does
`DELETE /api/v1/sessions?scope=all` ("Sign out everywhere"). The lookup is
cached per instance for 60 seconds, so another instance honours a revocation
within a minute. `iat` has one-second resolution: a token minted in the same
second as the revocation survives it.

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

## Sign in with Apple

`POST /api/v1/auth/apple` takes `{ identityToken, fullName?, authorizationCode? }`
from the iOS app.
`AppleIdentityVerifier` checks the RS256 signature against
`https://appleid.apple.com/auth/keys`, the issuer and the audience (the bundle id
`com.gbs.lifedeck`, a constant in the container), then `signInWithApple` signs in
by email through the same path as Google, claiming the requesting guest. A bad
token answers 401. Sign-in itself needs no secret.

App Store review requires revoking the grant when the account is deleted. With
`APPLE_SIGNIN_KEY_ID` and `APPLE_SIGNIN_PRIVATE_KEY` (a Sign in with Apple .p8
key of team `7NDK3458CP`, PEM text, `\n` escapes accepted) the sign-in trades
`authorizationCode` at `/auth/token` for a refresh token, stored encrypted in
`apple_grants`, and `deleteUser` posts it to `/auth/revoke` before deleting.
Both calls are best effort: a failure never blocks a sign-in or a deletion.
Without the key the grant is neither stored nor revoked.

Native clients use single-use codes in Redis to cross between the app and a
browser in both directions: `POST /api/v1/auth/native` after Google sign-in, and
`/api/v1/auth/web-handoff` to open a web page (billing) as the same account. See
[mobile.md](./mobile.md#auth).

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
