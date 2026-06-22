import { ApiKeysManager } from '@/components/api-keys-manager'
import { AppShell } from '@/components/app-shell'

export default function DevelopersPage() {
  return (
    <AppShell>
      <ApiKeysManager />
    </AppShell>
  )
}
