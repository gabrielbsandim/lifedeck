import type { ReactNode } from 'react'
import { AppSidebar } from '@/components/app-sidebar'
import { MobileTabBar } from '@/components/mobile-tab-bar'

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <>
      <AppSidebar />
      <div className="lg:pl-56">
        <main className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col gap-10 px-5 pb-28 pt-12 sm:pt-16 lg:py-24">
          {children}
        </main>
      </div>
      <MobileTabBar />
    </>
  )
}
