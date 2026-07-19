import { describe, expect, it } from 'vitest'
import {
  NoopWhatsappSessionWindow,
  type WhatsappSessionWindow,
} from '@/ports/whatsapp-session'

describe('NoopWhatsappSessionWindow', () => {
  it('accepts marks and always reports the window closed', async () => {
    const window: WhatsappSessionWindow = new NoopWhatsappSessionWindow()
    await expect(window.markActive('+5511999990000')).resolves.toBeUndefined()
    await expect(window.isOpen('+5511999990000')).resolves.toBe(false)
  })
})
