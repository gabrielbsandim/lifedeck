import type { ReactNode } from 'react'
import { cn } from '@lifedeck/ui'
import { AppSidebar } from '@/components/app-sidebar'
import { MobileTabBar } from '@/components/mobile-tab-bar'

export function AppShell({
  children,
  wide = false,
}: {
  children: ReactNode
  wide?: boolean
}) {
  return (
    <>
      <AppSidebar />
      <div className="lg:pl-56">
        <main
          className={cn(
            'mx-auto flex min-h-dvh w-full flex-col px-4 pb-28 pt-6 sm:px-5',
            wide
              ? 'max-w-5xl gap-6 lg:py-12'
              : 'max-w-2xl gap-10 sm:pt-10 lg:py-24',
          )}
        >
          {children}
        </main>
      </div>
      <MobileTabBar />
    </>
  )
}
