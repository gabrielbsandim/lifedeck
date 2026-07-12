import type { MediaPayload } from '@/ports/messaging-channel'

export interface Transcriber {
  transcribe(audio: MediaPayload): Promise<string>
  // False when no model is configured, so callers can refuse voice notes
  // before metering a credit for a transcription that cannot run.
  isAvailable(): boolean
}
