import type { BookingTokenSigner } from '@/ports/booking-token-signer'

export class FakeBookingTokenSigner implements BookingTokenSigner {
  sign(bookingId: string): string {
    return `signed.${bookingId}`
  }

  verify(token: string): string | null {
    return token.startsWith('signed.') ? token.slice('signed.'.length) : null
  }
}
