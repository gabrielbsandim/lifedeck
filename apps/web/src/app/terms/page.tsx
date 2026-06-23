import type { Metadata } from 'next'
import { TermsScreen } from '@/components/legal/terms-screen'

export const metadata: Metadata = {
  title: 'Termos de Uso',
}

export default function TermsPage() {
  return <TermsScreen />
}
