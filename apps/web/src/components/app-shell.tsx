import type { ReactNode } from 'react'
import { AppSidebar } from '@/components/app-sidebar'

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <>
      <AppSidebar />
      <div className="lg:pl-56">
        <main className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col gap-10 px-5 py-16 sm:py-24">
          {children}
        </main>
      </div>
    </>
  )
}
