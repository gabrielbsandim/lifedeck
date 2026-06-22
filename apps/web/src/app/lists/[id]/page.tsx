import { StandaloneListView } from '@/components/standalone-list-view'

export default async function ListPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col gap-10 px-5 py-16 sm:py-24">
      <StandaloneListView listId={id} />
    </main>
  )
}
