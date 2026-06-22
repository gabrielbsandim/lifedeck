import { SharedBoardView } from '@/components/shared-board-view'

export default async function SharedListPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col gap-10 px-5 py-16 sm:py-24">
      <SharedBoardView token={token} />
    </main>
  )
}
