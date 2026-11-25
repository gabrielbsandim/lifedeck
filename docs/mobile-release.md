# Mobile release runbook

How a version of the app reaches the stores, and how to take one back. The
workflow is `.github/workflows/mobile-release.yml`; the version logic is
`apps/mobile/src/lib/release/release-version.ts`.

## Cutting a release

1. Rewrite `apps/mobile/distribution/whatsnew/whatsnew-<locale>` for every
   app language (one file each, named after its first Play locale; the
   workflow copies it to the other variants) and commit it to `main`. `pnpm -C apps/mobile store:check --since
   <last tag>` fails while a file is unchanged.
2. `gh workflow run mobile-release.yml` (add `-f bump=minor` to force a digit).
   It reads the Conventional Commits since the last `v*` tag that touch the app
   or the packages it imports: `feat` is a minor, anything else a patch, and a
   breaking change a major (a minor while the app is 0.x). It pushes
   `release/vX.Y.Z` with the bump in `app.json`, opens the `release: vX.Y.Z`
   pull request with the notes, and dispatches CI on it. A run with no app
   change since the tag stops with a note in the summary.
3. Merge the pull request once CI is green and both `Maestro on android` and
   `Maestro on ios` jobs of the same run passed. Each builds the `e2e-test`
   profile on EAS (Android emulator APK, iOS simulator app, channel `e2e` so no
   OTA replaces the bundle) and runs `apps/mobile/.maestro/guest-smoke.yaml`
   on the runner, because EAS runs Maestro only on a paid plan. The flow starts
   as a guest, adds a task, completes it and deletes the account from Profile,
   Account. The build talks to production, and the deletion is the cleanup. A
   failed run keeps the Maestro screenshots as an artifact. Locally, with an
   emulator up: `MAESTRO_APP_ID=com.lifedeck.app maestro test
   .maestro/guest-smoke.yaml` from `apps/mobile`. Squash or merge commit both
   work.
4. The merge tags `vX.Y.Z`, publishes the GitHub release, and ships each
   platform on its own:

| Fingerprint of the merge | Android | iOS |
| --- | --- | --- |
| A finished store build already has it | OTA to the `production` branch | OTA to the `production` branch |
| No store build has it | EAS build, then the bundle goes to the Play `production` track as a **draft** with the `whatsnew` notes | EAS build with auto-submit to **TestFlight** |

The store review stays a manual click: roll out the Play draft (staged at 20%
first; 1.0.0 went out at 100% because nobody had the app yet) and submit the TestFlight build for review in App Store Connect, pasting
the notes into What's New.

`fingerprint.config.js` skips the version fields, so the bump alone never
forces a store build. A JS-only release therefore keeps the store version of
the last binary and reaches phones as an OTA.

## First release

- No tag exists yet, so pass the version: `gh workflow run mobile-release.yml
  -f version=1.0.0`. The notes say "First store release".
- Play accepts the first bundle from the workflow, but only as a draft while
  the app itself is a draft. The first publish happens in the Console: give
  the production track its countries (it starts with none), save the release
  and send the changes for review. Then set `ANDROID_APP_SIGNING_SHA256` on
  Vercel from Test and release, App integrity, and redeploy so
  `/.well-known/assetlinks.json` serves it.
- iOS credentials were created through the App Store Connect API (distribution
  certificate and profile, valid until 2027-11-25) and handed to EAS with a
  temporary `credentials.json`, because EAS's own login with the team key
  fails. CI builds reuse them; renew before they expire.
- App Store Connect refuses What's New on a first version, so
  `store.config.js` sends no release notes.
- The first review submission needed the content rights declaration (no
  third party content), the App Review contact, and China mainland out of the
  availability list, since it asks for an ICP filing and a local security
  assessment. Attach the TestFlight build to the version, then submit.
- Apple warns that from April 2027 uploads must be built with the iOS 27 SDK;
  bump the Expo SDK before then.

## OTA by hand

`gh workflow run mobile-update.yml -f branch=production` publishes the current
`main` to the production branch. Prefer a release: it leaves a tag to roll
back to.

## Rolling back

- **An OTA**: `eas update:republish --branch production --group <previous
  group id> --message "rollback"`. `eas update:list --branch production` lists
  the groups. To fall back to the code inside the binary, `eas update:roll-back-to-embedded
  --branch production --runtime-version <fingerprint>`.
- **A store build**: Play, halt the staged rollout and promote the previous
  release. App Store, remove the version from review, or ship a fixed build;
  Apple has no rollback of a live version.
- Revert the commits on `main` and cut a new release so the tags keep telling
  the truth.

## Credentials

All of them are GitHub secrets on the repository.

| Secret | What | Expires |
| --- | --- | --- |
| `EXPO_TOKEN` | Expo access token | when revoked |
| `ASC_API_KEY_P8`, `ASC_API_KEY_ID`, `ASC_API_KEY_ISSUER_ID` | App Store Connect team key "Lifedeck EAS", created 2026-11-24 | when revoked |
| `PLAY_SERVICE_ACCOUNT` | key of `play-publisher@kapi-d6f2d`, created 2026-11-24 | when revoked, unless the Cloud org sets a key lifetime |

Also on a clock: the Apple Developer Program membership (yearly) and the iOS
distribution certificate and provisioning profile EAS keeps (until
2027-11-25; `eas credentials` renews them), and the Sign in with Apple key
behind `APPLE_SIGNIN_KEY_ID` and `APPLE_SIGNIN_PRIVATE_KEY` on Vercel, which
the web uses to revoke the Apple grant when an account is deleted. The App Store key IDs are
injected into `eas.json` at build time, so they stay out of this public
repository.

## When something looks wrong

- **Every release builds**: compare the fingerprints, `eas fingerprint:compare`
  against the last store build. A config that differs between CI and the EAS
  worker shows up there.
- **The Play upload fails with a version code error**: `appVersionSource` is
  `remote`, so EAS owns the code; `eas build:version:set -p android` aligns it
  with the console.
