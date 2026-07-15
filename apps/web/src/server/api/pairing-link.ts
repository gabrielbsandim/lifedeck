import { z } from 'zod'

export const pairingRequestSchema = z.object({
  // Optional: the same-device flow pairs by code alone, with no phone entry.
  phone: z.string().trim().optional(),
})

/**
 * The assistant's public WhatsApp number as bare digits (E.164 without the +),
 * or null when WHATSAPP_BOT_NUMBER is not configured. Safe to return to the
 * client: it is the number users message anyway. The UI uses it to build a
 * localized deep link, so the pre-filled message reads as a friendly sentence
 * in the user's language instead of a bare code.
 */
export function whatsappBotNumber(): string | null {
  const bot = process.env.WHATSAPP_BOT_NUMBER?.replace(/\D/g, '')
  return bot ? bot : null
}

/**
 * Deep link that opens WhatsApp straight to our bot with the pairing code
 * pre-filled. Kept as a server-side fallback; the client now builds a localized
 * message around the code. The inbound handler extracts the 6-digit code from
 * whatever text arrives, so the body does not need to be the bare code.
 */
export function pairingDeepLink(code: string): string | null {
  const bot = whatsappBotNumber()
  if (!bot) {
    return null
  }
  return `https://wa.me/${bot}?text=${encodeURIComponent(code)}`
}
