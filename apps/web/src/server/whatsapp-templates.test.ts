import { describe, expect, it } from 'vitest'
import {
  WHATSAPP_TEMPLATES,
  WHATSAPP_TEMPLATE_LANGUAGE,
  whatsappTemplate,
} from '@/server/whatsapp-templates'

describe('whatsappTemplate', () => {
  it('pairs a registered name with the default language', () => {
    expect(whatsappTemplate(WHATSAPP_TEMPLATES.dailyBrief)).toEqual({
      name: 'daily_brief_v1',
      language: WHATSAPP_TEMPLATE_LANGUAGE,
    })
  })

  it('names every proactive message the assistant can send', () => {
    // These names must match the approved templates in the Meta WhatsApp
    // Manager; a rename here is a re-registration there.
    expect(WHATSAPP_TEMPLATES).toEqual({
      reminder: 'reminder_v1',
      dailyBrief: 'daily_brief_v1',
      habitCheckin: 'habit_checkin_v1',
      nudge: 'nudge_v1',
    })
  })
})
