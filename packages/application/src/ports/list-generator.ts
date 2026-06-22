import type { GeneratedPlan, GenerationBrief } from '@/dtos/ai-dto'

export interface ListGenerator {
  generate(brief: GenerationBrief): Promise<GeneratedPlan>
}
