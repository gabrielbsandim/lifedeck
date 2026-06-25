import { Suspense } from 'react'
import { AppShell } from '@/components/app-shell'
import { BillingScreen } from '@/components/billing/billing-screen'

export default function BillingPage() {
  return (
    <AppShell>
      <Suspense>
        <BillingScreen />
      </Suspense>
    </AppShell>
  )
}
