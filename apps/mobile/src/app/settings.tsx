// The drill-down half of the web's settings experience: the Profile hub pushes
// this route with a `section` param and the native header owns the back action.
import { Stack, useLocalSearchParams, useRouter } from 'expo-router'
import {
  availableSections,
  SectionBody,
  type SectionKey,
} from '@/components/settings/settings-sections'
import { Screen } from '@/components/ui'
import { useSession } from '@/lib/api/use-session'
import { useI18n } from '@/lib/i18n/messages-provider'

const SECTIONS: SectionKey[] = [
  'perfil',
  'conexoes',
  'preferencias',
  'seguranca',
  'plano',
  'conta',
]

function toSection(value: string | undefined): SectionKey {
  return SECTIONS.includes(value as SectionKey)
    ? (value as SectionKey)
    : 'perfil'
}

export default function SettingsScreen() {
  const params = useLocalSearchParams<{ section?: string }>()
  const { messages } = useI18n()
  const router = useRouter()
  const session = useSession()
  const user = session.data
  const section = toSection(params.section)

  if (!user) {
    return <Screen />
  }

  const label =
    availableSections(user, messages).find(item => item.key === section)
      ?.label ?? messages.settings.title

  return (
    <Screen>
      <Stack.Screen options={{ title: label }} />
      <SectionBody
        section={section}
        user={user}
        // Signing out (or deleting the account) leaves this screen orphaned on
        // top of the stack, so drop back to the board the gate covers.
        onSignedOut={() => router.replace('/')}
      />
    </Screen>
  )
}
