import type {
  GeneratedPlan,
  GenerationBrief,
  ListGenerator,
} from '@lifedeck/application'

const SCALE_STEPS: Record<GenerationBrief['scale'], number> = {
  small: 3,
  medium: 5,
  large: 8,
}

export class StubListGenerator implements ListGenerator {
  async generate(brief: GenerationBrief): Promise<GeneratedPlan> {
    const label = brief.title?.trim() || brief.category
    const steps = SCALE_STEPS[brief.scale]
    const tasks = Array.from({ length: steps }, (_, index) => ({
      title: `${label}: step ${index + 1}`,
      note:
        index === 0
          ? 'Generated locally without an AI provider. Set AI_MODEL for real plans.'
          : undefined,
    }))

    return {
      listTitle: brief.title?.trim() || `${brief.category} plan`,
      tasks,
    }
  }
}
