import type { MediaPayload } from '@/ports/messaging-channel'

export interface VisionReader {
  describe(image: MediaPayload): Promise<string>
  // False when no model is configured, so callers can refuse images before
  // metering a credit for a vision read that cannot run.
  isAvailable(): boolean
}
