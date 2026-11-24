// The manage link is not stored: it is a MAC over the booking id, so any email
// can rebuild it and rotating the key revokes every link at once.
export interface BookingTokenSigner {
  sign(bookingId: string): string
  /** The booking id, or null when the token is malformed or forged. */
  verify(token: string): string | null
}
