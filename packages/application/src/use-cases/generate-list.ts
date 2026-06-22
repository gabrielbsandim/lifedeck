import {
  generatedPlanSchema,
  generationBriefSchema,
  type GeneratedListView,
  type GeneratedTask,
  type GenerationBrief,
} from '@/dtos/ai-dto'
import type { ListGenerator } from '@/ports/list-generator'

const MAX_DRAFT_TASKS = 60

type Dependencies = {
  generator: ListGenerator
}

function flatten(
  tasks: GeneratedTask[],
): { title: string; note: string | null }[] {
  return tasks.map(task => ({ title: task.title, note: task.note ?? null }))
}

export function makeGenerateList({ generator }: Dependencies) {
  return async function generateList(
    input: GenerationBrief,
  ): Promise<GeneratedListView> {
    const brief = generationBriefSchema.parse(input)

    const raw = await generator.generate(brief)
    const plan = generatedPlanSchema.parse(raw)

    const ordered: GeneratedTask[] = [
      ...plan.tasks,
      ...(plan.sections ?? []).flatMap(section => section.tasks),
    ]

    return {
      title: plan.listTitle,
      tasks: flatten(ordered).slice(0, MAX_DRAFT_TASKS),
    }
  }
}
