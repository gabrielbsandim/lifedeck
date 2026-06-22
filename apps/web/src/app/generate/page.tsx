import { AiGenerator } from '@/components/ai-generator'

export default function GeneratePage() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col gap-10 px-5 py-16 sm:py-24">
      <AiGenerator />
    </main>
  )
}
