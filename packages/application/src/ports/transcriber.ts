import type { MediaPayload } from '@/ports/messaging-channel'

export interface Transcriber {
  transcribe(audio: MediaPayload): Promise<string>
}
