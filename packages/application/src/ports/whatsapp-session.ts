// WhatsApp only allows free-form (non-template) messages within 24 hours of the
// user's last inbound message — the "customer service window". We record each
// inbound message and check whether the window is still open before deciding
// how to deliver a proactive reminder: a normal text while it is open, a
// pre-approved template once it has closed.
export interface WhatsappSessionWindow {
  /** Record that the user just messaged us, opening/extending the 24h window. */
  markActive(address: string): Promise<void>
  /** Whether a free-form message may be sent now (user messaged within 24h). */
  isOpen(address: string): Promise<boolean>
}

// Used when no session backend is configured: never claims the window is open,
// so delivery falls back to the template (or the in-app notification alone).
export class NoopWhatsappSessionWindow implements WhatsappSessionWindow {
  async markActive(): Promise<void> {}

  async isOpen(): Promise<boolean> {
    return false
  }
}
