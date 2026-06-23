import type { Metadata } from 'next'
import { StatusScreen } from '@/components/status-screen'

export const metadata: Metadata = {
  title: 'Status',
}

export default function StatusPage() {
  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-10 sm:py-16">
      <StatusScreen />
    </main>
  )
}
