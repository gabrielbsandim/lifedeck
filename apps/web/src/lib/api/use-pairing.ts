'use client'

import { useMutation } from '@tanstack/react-query'
import { apiRequest } from '@/lib/api/client'

export interface PairingResult {
  status: string
  code?: string
  deepLink?: string | null
}

/**
 * Start linking the signed-in account to a WhatsApp number. Returns a pairing
 * code and a wa.me deep link the user taps to send it to the assistant.
 */
export function useStartWhatsappPairing() {
  return useMutation({
    mutationFn: (phone?: string) =>
      apiRequest<PairingResult>('/api/v1/messaging/whatsapp/pairing', {
        method: 'POST',
        body: JSON.stringify(phone ? { phone } : {}),
      }),
  })
}
