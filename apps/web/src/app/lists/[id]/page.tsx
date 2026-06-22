import { StandaloneListView } from '@/components/standalone-list-view'
import { AppShell } from '@/components/app-shell'

export default async function ListPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return (
    <AppShell>
      <StandaloneListView listId={id} />
    </AppShell>
  )
}
