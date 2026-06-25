import type { MediaPayload } from '@/ports/messaging-channel'

export interface VisionReader {
  describe(image: MediaPayload): Promise<string>
}
