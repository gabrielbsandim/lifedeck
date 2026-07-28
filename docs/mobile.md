# Mobile app

`apps/mobile` is the Lifedeck iOS + Android app: a thin client over the same
versioned REST API (`/api/v1`) the web uses. It reuses every pure package
(`domain`, `application` types, `i18n`) and rebuilds only the presentation layer
natively. The plan and the record of what shipped live in
[v4-plan.md](./v4-plan.md).

## Stack

| Area        | Choice                                                    |
| ----------- | --------------------------------------------------------- |
| Runtime     | Expo SDK 57, React Native 0.86, React 19.2, new architecture |
| Navigation  | Expo Router (file-based, mirrors the web's App Router)     |
| Styling     | NativeWind 4 (Tailwind classes, same token names as the web) |
| Data        | TanStack Query + `@lifedeck/client`                       |
| Auth        | Session JWT in `expo-secure-store`, sent as `Authorization: Bearer` |

## Running it

```bash
cd apps/mobile
cp .env.example .env      # EXPO_PUBLIC_API_URL -> your API host
pnpm start
```

`EXPO_PUBLIC_*` values are inlined into the bundle, so never put a secret there.
On a physical device or the Android emulator, `localhost` is the device itself —
use your machine's LAN IP.

**A development build is required** (Expo Go will not work): the app uses
SecureStore, audio recording, the image picker and the native date picker.

```bash
npx expo run:ios          # or: npx expo run:android
```

To check that everything still bundles without a device:

```bash
npx expo export --platform ios
npx expo export --platform android
```

## Layout

```
src/
├── app/                  Expo Router routes (see the table in v4-plan.md §6)
│   ├── (tabs)/           Today · Lists · Assistant · Profile
│   └── …                 habits, recurring, calendar, analytics, settings, …
├── components/           Screen bodies + the RN design system in ui/
├── lib/
│   ├── api/              Data hooks (ported from apps/web/src/lib/api)
│   ├── auth/             Native Google sign-in
│   ├── billing/          Price book + plan display (shared logic, copied)
│   ├── calendar/         Calendar range math (shared logic, copied)
│   ├── i18n/             MessagesProvider over @lifedeck/i18n
│   ├── media/            Voice recording
│   ├── notifications/    Push permission, registration and tap routing
│   └── updates/          Over-the-air update checks
└── theme/                Token palette + useThemeColors()
```

## Conventions worth knowing

**Hooks are copies, on purpose.** `src/lib/api/use-*.ts` are near-verbatim
copies of the web's hooks, not shared modules. The mobile API client's base URL
deliberately excludes `/api/v1` so the hook bodies are character-for-character
identical to the web's and stay trivial to diff. Each file says so at the top;
the ones that genuinely differ (`use-session`, `use-auth`, `use-account`,
`use-assistant`) explain why. **When you change a hook on either side, change
the other.** The reasoning behind not sharing them is in v4-plan.md §11.

**Theming follows the device.** Tokens come from `packages/ui/src/styles.css`,
pre-converted from oklch to sRGB channels in `src/theme/palette.json` (light and
dark), declared as CSS variables in `src/global.css`, and mapped in
`tailwind.config.js` as `rgb(var(--color-x) / <alpha-value>)`. So `bg-brand-600`
and `bg-success/15` mean the same thing here as on the web and invert the same
way. For native props NativeWind cannot reach (navigation theming,
`placeholderTextColor`, SVG fills) use `useThemeColors()`, never the static
`colors` export — that one is light-only and exists for default props evaluated
outside a render.

**Metro, Babel and pnpm.** React Native's toolchain assumes a hoisted
`node_modules`; pnpm gives each package only its own declared dependencies.
Three consequences, all of them found the hard way:

- `disableHierarchicalLookup` must stay **OFF** in `metro.config.js`. The usual
  monorepo advice is to turn it on, but that assumes the hoisted layout, and
  with it on every transitive import fails to resolve.
- Packages our own source pulls in through a toolchain
  (`@expo/metro-runtime`, `react-native-css-interop`, `babel-preset-expo`) are
  declared as direct dependencies, because a config file naming a package makes
  it a direct dependency whether or not the package manager agrees.
- The root `.npmrc` hoists `@babel/*`, `babel-plugin-*` and `babel-preset-*` to
  the workspace root. Babel resolves the plugins a preset names as strings from
  the app directory, and pnpm does not put them there. **Setting
  `public-hoist-pattern` replaces pnpm's default list rather than adding to it**,
  so `*eslint*` and `*prettier*` are repeated there; drop them and every shared
  eslint config stops resolving.

The last two only show up in a clean install. A machine that has run `pnpm add`
a few times keeps enough in the virtual store to hide them, so CI finds them
first.

## Icons and splash

`assets/*.png` are generated from the SVGs in `assets/source/`. After editing a
source, re-render them:

```bash
node scripts/render-mobile-assets.mjs
```

The constraints are baked into the sources: the store icon is opaque and full
bleed (iOS rejects an alpha channel and rounds the corners itself), the Android
adaptive foreground is transparent and stays inside the central safe zone the
launcher masks to, and the notification icon is white on transparent because
Android keeps only the alpha channel.

## Releasing

Two layers, and the difference matters:

| Change | How it ships |
| --- | --- |
| JS, styles, assets | **EAS Update.** Every push to `main` that touches the app publishes to the `preview` branch; installed builds download it in the background and apply it the next time the app is opened. |
| Native modules, permissions, icon, splash, SDK bump, first install | **EAS Build.** Run the `Mobile build` workflow manually. |

The `fingerprint` runtime version keeps the two honest: a bundle whose native
fingerprint differs from the installed build is never offered to it, so an OTA
cannot land on a binary that lacks the native code it needs.

### One-time setup

1. Create an Expo account, then from `apps/mobile` run `eas init`. It writes the
   project id into `app.json`, which is what `eas update` and `eas build` need.
2. Generate an access token in the Expo dashboard (Account settings, Access
   tokens) and add it to GitHub as the `EXPO_TOKEN` secret. Both workflows skip
   themselves with a note in the run summary until it exists.
3. iOS only: a paid Apple Developer Program membership, then `eas device:create`
   and open the link on each test phone to register it. Ad hoc builds install
   from a link; TestFlight instead invites by email but adds Apple's processing
   step to every build.

Android needs nothing beyond steps 1 and 2: `preview` produces an APK that
installs from the EAS link, and EAS generates and keeps the keystore.

### Day to day

```bash
eas build --profile preview --platform android   # or ios, or all
eas update --branch preview --message "what changed"
```

`eas.json` holds the profiles. `EXPO_PUBLIC_API_URL` is set per profile there
and baked into the bundle at build time, so it is a build input rather than a
runtime setting, and never a place for a secret.

**The EAS worker installs but does not build.** The workspace packages resolve
through their `dist/`, which is generated and gitignored, so on a clean worker
`@lifedeck/domain` is found and then fails with a missing `main`. The
`eas-build-post-install` script in `apps/mobile/package.json` runs turbo over
the app's workspace dependencies to fill that gap. It has no equivalent in the
OTA workflow, where the verification steps already build them.

## Push notifications

Delivery goes through Expo's push service, which fronts APNs and FCM so no
per-platform credentials live in this repo; EAS holds them. `EXPO_ACCESS_TOKEN`
is only needed once the Expo account turns on enhanced push security.

Server side, every in-app notification is created through one helper
(`makePublishNotification`), and that helper also sends the push. The two cannot
drift: anything that reaches the bell reaches the lock screen, and anything
deliberately kept quiet (a brief WhatsApp already delivered) stays quiet on both.
Tokens the provider reports as `DeviceNotRegistered` are deleted; nothing else
counts as a dead token, so an account-level credentials error cannot wipe every
registration at once.

App side, `usePushNotifications()` asks for permission once a real account is
signed in (never for a guest), registers the token, refetches the bell when an
alert arrives, and routes a tap to the screen the notification is about. Signing
out hands the registration back first, while the call is still authenticated:
the phone stays in someone's hand, and the next alert must not put the previous
user's tasks on its lock screen.

Reminders can arrive twice for someone who has both the app and WhatsApp
reminders on. That is deliberate for now: push mirrors the bell rather than
changing which channel wins, and `reminderWhatsapp` in settings already turns
the other one off.

## Testing

`pnpm test` runs vitest over the app's **pure** modules (date math, calendar
ranges, base64, weekday labels, `cn`, prices) at the workspace-wide 95% gate.
Screens are React Native trees that need a native renderer (jest-expo / React
Native Testing Library) rather than jsdom; today they are covered by typecheck,
lint and the bundle. `vitest.config.ts` records the scope.

## Auth

Sessions are the same HS256 JWT the web keeps in an httpOnly cookie; the app has
no cookie jar, so session-issuing endpoints also return the token in the body
and the app stores it in the keychain.

Google sign-in cannot end in a cookie the app can read, so it uses a single-use
code: `/auth/google?platform=native` marks the OAuth state, the callback stores
the token in Redis under a 2-minute one-time code and redirects to
`lifedeck://auth?code=…`, and `POST /auth/native` trades that code for the token
over HTTPS. The token never travels through the custom-scheme URL, which any app
on the device could claim.

## Not in the app yet

- **In-app purchases.** Apple and Google require IAP for digital goods, so the
  billing screen is read-only and hands checkout to the web. Blocked on store
  accounts rather than on effort; v4-plan.md §12 has the design and the
  blockers.
- **Universal links.** Deep links use the `lifedeck://` scheme; associating the
  web domain needs the store build.
- **Offline.** The app is an online thin client with the React Query cache only.
