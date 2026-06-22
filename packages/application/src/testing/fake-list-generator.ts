import type { GeneratedPlan, GenerationBrief } from '@/dtos/ai-dto'
import type { ListGenerator } from '@/ports/list-generator'

export class FakeListGenerator implements ListGenerator {
  public lastBrief: GenerationBrief | null = null

  constructor(private readonly plan: GeneratedPlan | (() => GeneratedPlan)) {}

  async generate(brief: GenerationBrief): Promise<GeneratedPlan> {
    this.lastBrief = brief
    return typeof this.plan === 'function' ? this.plan() : this.plan
  }
}
