import { createHmac, timingSafeEqual } from 'node:crypto'
import type { BookingTokenSigner } from '@lifedeck/application'

const MIN_SECRET_LENGTH = 32
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/

/** `<bookingId>.<base64url HMAC-SHA256 of the id>`; nothing is stored. */
export class HmacBookingTokenSigner implements BookingTokenSigner {
  constructor(private readonly secret: string) {
    if (secret.length < MIN_SECRET_LENGTH) {
      throw new Error(
        `The booking link secret needs at least ${MIN_SECRET_LENGTH} characters.`,
      )
    }
  }

  private mac(bookingId: string): Buffer {
    return createHmac('sha256', this.secret)
      .update(`booking:${bookingId}`)
      .digest()
  }

  sign(bookingId: string): string {
    return `${bookingId}.${this.mac(bookingId).toString('base64url')}`
  }

  verify(token: string): string | null {
    const [bookingId, signature, extra] = token.split('.')
    if (
      !bookingId ||
      !signature ||
      extra !== undefined ||
      !UUID.test(bookingId)
    ) {
      return null
    }
    const given = Buffer.from(signature, 'base64url')
    const expected = this.mac(bookingId)
    if (given.length !== expected.length) {
      return null
    }
    return timingSafeEqual(given, expected) ? bookingId : null
  }
}
