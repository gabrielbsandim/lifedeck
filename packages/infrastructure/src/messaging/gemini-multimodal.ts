import { generateText, type LanguageModel, type ModelMessage } from 'ai'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import type {
  MediaPayload,
  Transcriber,
  VisionReader,
} from '@lifedeck/application'

const DEFAULT_GEMINI_MODEL = 'gemini-2.5-flash'

const TRANSCRIBE_PROMPT =
  'Transcribe the attached audio message verbatim. Output only the transcription text, in the original language.'
const VISION_PROMPT =
  'Describe the attached image for an assistant. Extract any text and note anything actionable (dates, amounts, tasks). Be concise.'

function filePart(media: MediaPayload): ModelMessage {
  return {
    role: 'user',
    content: [{ type: 'file', data: media.data, mediaType: media.mimeType }],
  }
}

class StubTranscriber implements Transcriber {
  async transcribe(): Promise<string> {
    return '[voice message received]'
  }
}

class StubVisionReader implements VisionReader {
  async describe(): Promise<string> {
    return '[image received]'
  }
}

export class GeminiTranscriber implements Transcriber {
  constructor(private readonly model: LanguageModel) {}

  async transcribe(audio: MediaPayload): Promise<string> {
    const { text } = await generateText({
      model: this.model,
      system: TRANSCRIBE_PROMPT,
      messages: [filePart(audio)],
    })
    return text
  }
}

export class GeminiVisionReader implements VisionReader {
  constructor(private readonly model: LanguageModel) {}

  async describe(image: MediaPayload): Promise<string> {
    const { text } = await generateText({
      model: this.model,
      system: VISION_PROMPT,
      messages: [filePart(image)],
    })
    return text
  }
}

function geminiModel(): LanguageModel | null {
  const geminiKey = process.env.GEMINI_API_KEY?.trim()
  if (!geminiKey) {
    return null
  }
  const google = createGoogleGenerativeAI({ apiKey: geminiKey })
  return google(process.env.GEMINI_MODEL_ID?.trim() || DEFAULT_GEMINI_MODEL)
}

export function createTranscriber(): Transcriber {
  const model = geminiModel()
  return model ? new GeminiTranscriber(model) : new StubTranscriber()
}

export function createVisionReader(): VisionReader {
  const model = geminiModel()
  return model ? new GeminiVisionReader(model) : new StubVisionReader()
}
