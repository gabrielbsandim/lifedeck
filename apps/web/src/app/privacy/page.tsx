import type { Metadata } from 'next'
import { PrivacyScreen } from '@/components/legal/privacy-screen'

export const metadata: Metadata = {
  title: 'Política de Privacidade',
}

export default function PrivacyPage() {
  return <PrivacyScreen />
}
