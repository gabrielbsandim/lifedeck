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
│   └── media/            Voice recording
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

**Metro and pnpm.** `disableHierarchicalLookup` must stay OFF. The usual
monorepo advice is to turn it on, but that assumes a hoisted layout; pnpm nests
each package's dependencies, so Metro has to be allowed to walk up from the
importing file or transitive imports fail to resolve. Packages our own source
pulls in through a toolchain (`@expo/metro-runtime`, `react-native-css-interop`)
are declared as direct dependencies for the same reason.

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
  billing screen is read-only and hands checkout to the web. V4.1.
- **Push notifications.** Proactive messages still arrive over WhatsApp and the
  in-app notification bell. V4.1.
- **Universal links.** Deep links use the `lifedeck://` scheme; associating the
  web domain needs the store build.
- **Offline.** The app is an online thin client with the React Query cache only.
