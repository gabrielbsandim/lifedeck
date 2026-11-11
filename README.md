# Lifedeck

[![Next.js](https://img.shields.io/badge/Next.js-16%20App%20Router-black.svg?logo=next.js&logoColor=white)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB.svg?logo=react&logoColor=black)](https://react.dev/)
[![Expo](https://img.shields.io/badge/Expo-SDK%2057-000020.svg?logo=expo&logoColor=white)](https://expo.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-Strict-3178C6.svg?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Prisma](https://img.shields.io/badge/Prisma-6-2D3748.svg?logo=prisma&logoColor=white)](https://www.prisma.io/)
[![Coverage Gate](https://img.shields.io/badge/Coverage%20Gate-95%25-brightgreen.svg)]()
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)

**A shareable, multilingual task and checklist platform engineered with strict Clean Architecture.**

Lifedeck combines daily productivity planning with standalone shareable checklists, time-zone aware streak analytics, AI-assisted checklist generation, and a fully versioned, white-label OpenAPI REST API.

---

## Standout Features

- **Frictionless Guest Onboarding:** Start organizing immediately by entering a name. Upgrade to a permanent account anytime (Email/Password with code verification or Google OAuth) without losing state.
- **Time-Zone & Civil Day Aware:** Daily boards, morning digests, and streak counters strictly honor the user's local civil day, auto-detected from the browser and manually overridable.
- **AI-Powered List Synthesis:** Describe any project or routine in natural language and receive an editable, structured checklist in seconds.
- **Sharing & Real-time Collaboration:** Invite team members to collaborate with granular permissions or publish read-only public links.
- **White-Label REST API (`/api/v1`):** Complete OpenAPI 3.1 specification rendered with Scalar, designed for headless embedding and third-party integrations.
- **Trilingual Localization:** First-class support for English, Portuguese, and Spanish, negotiated automatically via `Accept-Language` headers with zero client bundle overhead.
- **Cross-Platform Parity:** Web client (Next.js 16) and mobile client (Expo SDK 57 / React Native) consuming the same domain use cases and API contracts.

---

## Clean Architecture Monorepo

Lifedeck is organized as a **pnpm + Turborepo monorepo** with strict inward dependency rules:

```
lifedeck/
├── apps/
│   ├── web/                   # Next.js 16 (App Router): UI, Server Actions, REST API (/api/v1)
│   └── mobile/                # Expo SDK 57 / React Native 0.86: Thin client consuming /api/v1
├── packages/
│   ├── domain/                # Pure entities, value objects, domain errors (0 external dependencies)
│   ├── application/           # Use cases, ports (interfaces), Zod DTOs, in-memory test fakes
│   ├── infrastructure/        # Prisma 6 repositories, Neon Postgres, Resend email adapters
│   ├── client/                # Shared typed API transport & request/response contracts
│   ├── ui/                    # Shared design system (React 19 + Tailwind CSS 4 + Framer Motion)
│   ├── i18n/                  # Typed SSR message catalogs (en, pt, es) and detection logic
│   └── config/                # Shared tsconfig, ESLint, Prettier, and Vitest presets
└── docs/                      # In-depth architectural, API, and deployment documentation
```

> **Dependency Inversion:** `domain ← application ← infrastructure ← apps/web`. The `domain` layer has zero framework or database dependencies. The mobile client reuses `domain`, `application` types, and `i18n` directly.

---

## Tech Stack Overview

| Layer | Technologies |
| :--- | :--- |
| **Web Frontend** | Next.js 16 (App Router), React 19, TypeScript, TanStack Query |
| **Styling & Motion** | Tailwind CSS 4, Framer Motion, custom accessible design tokens |
| **Backend & API** | Next.js Route Handlers, REST `/api/v1`, Zod schema validation, OpenAPI + Scalar |
| **Persistence** | Prisma 6 + Neon Serverless PostgreSQL |
| **Email** | Resend with typed transactional templates |
| **Mobile Client** | Expo SDK 57, React Native 0.86, Expo Router, NativeWind |
| **Testing & Quality** | Vitest + Testing Library (**95% coverage CI gate**), pnpm workspaces, Turborepo |
| **Hosting** | Vercel (Web & API), Neon (Database) |

---

## Getting Started

### Prerequisites

- **Node.js:** `>= 24.0.0`
- **pnpm:** `>= 9.0.0` (activate via `corepack enable`)

### 1. Web Application & API Setup

```bash
# Install dependencies across all workspaces
pnpm install

# Configure environment variables
cp .env.example .env

# Launch local development server (http://localhost:3000)
pnpm dev
```

### 2. Mobile App Setup (Expo)

```bash
cd apps/mobile

# Set API URL in local env
cp .env.example .env

# Start Expo development server (requires development build for native modules)
pnpm start
```

---

## Quality Gates & Verification

Every pull request must pass the automated quality pipeline:

```bash
pnpm lint              # Run ESLint 9 across all packages
pnpm typecheck         # Verify TypeScript strict compliance
pnpm test              # Run unit tests
pnpm test:coverage     # Verify test suite passes the 95% coverage gate
pnpm check             # Full CI parity check (lint + typecheck + format + coverage)
```

---

## Documentation Index

- [Architecture & Layers](./docs/architecture.md)
- [Configuration & Environment](./docs/configuration.md)
- [API Reference & OpenAPI](./docs/api.md)
- [Security Model](./docs/security.md)
- [Testing Philosophy & Fakes](./docs/testing.md)
- [Design System Tokens](./docs/design-system.md)
- [AI List Generation](./docs/ai-generation.md)
- [Mobile Architecture](./docs/mobile.md)
- [Internationalization (i18n)](./docs/i18n.md)
- [Contributing Guide](./CONTRIBUTING.md)

---

## License

[MIT](./LICENSE) © Gabriel Sandim
