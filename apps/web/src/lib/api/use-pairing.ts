'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiRequest } from '@/lib/api/client'

export interface PairingResult {
  status: string
  code?: string
  deepLink?: string | null
  waNumber?: string | null
}

export interface WhatsappChannelView {
  status: 'linked' | 'pending' | 'none'
  address?: string
  waNumber?: string | null
}

export const whatsappChannelKey = ['whatsapp-channel'] as const

/**
 * Start linking the signed-in account to a WhatsApp number. Returns a pairing
 * code plus the assistant's number, so the card can open WhatsApp with a
 * friendly, ready-to-send message.
 */
export function useStartWhatsappPairing() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (phone?: string) =>
      apiRequest<PairingResult>('/api/v1/messaging/whatsapp/pairing', {
        method: 'POST',
        body: JSON.stringify(phone ? { phone } : {}),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: whatsappChannelKey })
    },
  })
}

/**
 * Current WhatsApp link status for the signed-in account. Polls only while a
 * pairing is pending (a live code is waiting to be sent), so the card flips to
 * "connected" the moment the user sends it, then stops. Starting a pairing
 * invalidates this query, which refetches and kicks off the polling.
 */
export function useWhatsappChannel(enabled = true) {
  return useQuery({
    queryKey: whatsappChannelKey,
    queryFn: () =>
      apiRequest<WhatsappChannelView>('/api/v1/messaging/whatsapp/pairing'),
    enabled,
    refetchInterval: query =>
      query.state.data?.status === 'pending' ? 4000 : false,
  })
}
