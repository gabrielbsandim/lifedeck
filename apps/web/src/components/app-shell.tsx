import type { ReactNode } from 'react'
import { AppSidebar } from '@/components/app-sidebar'
import { MobileTabBar } from '@/components/mobile-tab-bar'
import { RequireAuth } from '@/components/require-auth'

// Keep this a server component: importing from the @lifedeck/ui barrel here would
// pull its client-only components (framer-motion) into the RSC graph and break
// the build. The width variants are a plain string join, no `cn` needed.
export function AppShell({
  children,
  wide = false,
}: {
  children: ReactNode
  wide?: boolean
}) {
  const mainClass = [
    'mx-auto flex min-h-dvh w-full flex-col px-4 pb-28 pt-6 sm:px-5',
    wide ? 'max-w-5xl gap-6 lg:py-12' : 'max-w-2xl gap-10 sm:pt-10 lg:py-24',
  ].join(' ')
  return (
    <>
      <AppSidebar />
      <div className="lg:pl-56">
        <main className={mainClass}>
          <RequireAuth>{children}</RequireAuth>
        </main>
      </div>
      <MobileTabBar />
    </>
  )
}
