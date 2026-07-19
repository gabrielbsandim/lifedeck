import { generateText, type LanguageModel, type ModelMessage } from 'ai'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import {
  MediaUnderstandingUnavailableError,
  type MediaPayload,
  type Transcriber,
  type VisionReader,
} from '@lifedeck/application'

const DEFAULT_GEMINI_MODEL = 'gemini-2.5-flash'

const TRANSCRIBE_PROMPT =
  'You are transcribing a short voice message the user sent to a personal assistant that manages their tasks, lists, and calendar. The audio is usually in Brazilian Portuguese and often mixes in everyday English words (for example "checkout", "call", "meeting", "deadline", "reminder", "standup", "review"). Transcribe it verbatim in the language spoken, keeping those words exactly as said — do not translate them or replace them with similar-sounding names. If a short segment is unclear, prefer a common task or calendar word over an unusual proper name. Output only the transcription, with no extra commentary.'
const VISION_PROMPT =
  'Describe the attached image for an assistant. Extract any text and note anything actionable (dates, amounts, tasks). Be concise.'

function filePart(media: MediaPayload): ModelMessage {
  return {
    role: 'user',
    content: [{ type: 'file', data: media.data, mediaType: media.mimeType }],
  }
}

// Without a configured model we refuse loudly rather than feed a placeholder
// transcription to the assistant. The inbound handler turns this into a clear
// "send it as text" reply, so a missing GEMINI_API_KEY never ships silently.
class StubTranscriber implements Transcriber {
  isAvailable(): boolean {
    return false
  }

  async transcribe(): Promise<string> {
    throw new MediaUnderstandingUnavailableError('audio')
  }
}

class StubVisionReader implements VisionReader {
  isAvailable(): boolean {
    return false
  }

  async describe(): Promise<string> {
    throw new MediaUnderstandingUnavailableError('image')
  }
}

export class GeminiTranscriber implements Transcriber {
  constructor(private readonly model: LanguageModel) {}

  isAvailable(): boolean {
    return true
  }

  async transcribe(audio: MediaPayload): Promise<string> {
    const { text } = await generateText({
      model: this.model,
      system: TRANSCRIBE_PROMPT,
      messages: [filePart(audio)],
      // Deterministic decoding: transcription should faithfully follow the audio,
      // not creatively guess an unusual name for an unclear word.
      temperature: 0,
    })
    return text
  }
}

export class GeminiVisionReader implements VisionReader {
  constructor(private readonly model: LanguageModel) {}

  isAvailable(): boolean {
    return true
  }

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
