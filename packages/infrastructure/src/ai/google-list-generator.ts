import { createGoogleGenerativeAI } from '@ai-sdk/google'
import type { ListGenerator } from '@lifedeck/application'
import { AiSdkListGenerator } from '@/ai/ai-sdk-list-generator'

const DEFAULT_GEMINI_MODEL = 'gemini-2.5-flash'

/**
 * Builds a list generator backed by the Google Generative AI (Gemini) API
 * directly, authenticated with a Gemini API key rather than routing through the
 * Vercel AI Gateway. Mirrors how Obra Nova consumes Gemini (`GEMINI_API_KEY`,
 * `GEMINI_MODEL_ID`).
 */
export function createGoogleListGenerator(config: {
  apiKey: string
  modelId?: string
}): ListGenerator {
  const google = createGoogleGenerativeAI({ apiKey: config.apiKey })
  return new AiSdkListGenerator(google(config.modelId ?? DEFAULT_GEMINI_MODEL))
}
