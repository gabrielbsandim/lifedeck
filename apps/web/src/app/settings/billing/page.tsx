import { Suspense } from 'react'
import { PlansScreen } from '@/components/billing/plans-screen'

// The plans page is a focused, full-bleed upgrade flow with its own header and
// "back to settings" link, so it renders standalone rather than inside the
// AppShell sidebar chrome.
export default function BillingPage() {
  return (
    <Suspense>
      <PlansScreen />
    </Suspense>
  )
}
