export const AI_OPERATIONS = [
  'listGeneration',
  'assistantText',
  'assistantPro',
  'audioTranscription',
  'imageVision',
] as const

export type AiOperation = (typeof AI_OPERATIONS)[number]

export function isAiOperation(value: string): value is AiOperation {
  return (AI_OPERATIONS as readonly string[]).includes(value)
}

const CREDIT_COST: Record<AiOperation, number> = {
  listGeneration: 1,
  assistantText: 1,
  assistantPro: 6,
  audioTranscription: 2,
  imageVision: 2,
}

export function creditCostOf(operation: AiOperation): number {
  return CREDIT_COST[operation]
}
