import { z } from 'zod'

export const pairingRequestSchema = z.object({
  phone: z.string().trim().min(1),
})

/**
 * Deep link that opens WhatsApp straight to our bot with the pairing code
 * pre-filled, so the user taps once instead of copying a code across apps. The
 * code is the entire message body so the inbound handler's exact-match lookup
 * still finds it. Returns null when WHATSAPP_BOT_NUMBER is not configured, in
 * which case the UI falls back to showing the code to send by hand.
 */
export function pairingDeepLink(code: string): string | null {
  const bot = process.env.WHATSAPP_BOT_NUMBER?.replace(/\D/g, '')
  if (!bot) {
    return null
  }
  return `https://wa.me/${bot}?text=${encodeURIComponent(code)}`
}
