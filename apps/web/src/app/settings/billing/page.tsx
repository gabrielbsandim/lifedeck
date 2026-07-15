import { Suspense } from 'react'
import { AppShell } from '@/components/app-shell'
import { PlansScreen } from '@/components/billing/plans-screen'

export default function BillingPage() {
  return (
    <AppShell wide>
      <Suspense>
        <PlansScreen />
      </Suspense>
    </AppShell>
  )
}
