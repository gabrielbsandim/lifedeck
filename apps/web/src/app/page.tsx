import { DailyListPreview } from '@/components/daily-list-preview'

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col gap-10 px-5 py-16 sm:py-24">
      <DailyListPreview />
    </main>
  )
}
