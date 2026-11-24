import { describe, expect, it } from 'vitest'
import type { BookingNotice } from '@lifedeck/application'
import { renderBookingEmail } from '@/email/render-booking-email'

function notice(overrides: Partial<BookingNotice> = {}): BookingNotice {
  return {
    kind: 'confirmed',
    bookingId: 'b-1',
    serviceName: 'Aula <1>',
    hostName: 'Ana',
    clientName: 'João',
    startsAt: new Date('2026-06-23T13:00:00.000Z'),
    endsAt: new Date('2026-06-23T14:00:00.000Z'),
    timeZone: 'America/Sao_Paulo',
    location: { kind: 'online-link', url: 'https://meet.test/ana' },
    meetingUrl: null,
    manageUrl: 'https://lifedeck.test/b/manage/t',
    reason: null,
    sequence: 1782219600,
    ...overrides,
  }
}

describe('renderBookingEmail', () => {
  it('shows the Google Meet link once Google created it', () => {
    const meet = { kind: 'online-meet' as const }
    const linked = renderBookingEmail(
      notice({
        location: meet,
        meetingUrl: 'https://meet.google.com/abc-defg-hij',
      }),
      'en',
    )
    expect(linked.html).toContain('https://meet.google.com/abc-defg-hij')
    expect(linked.ics).toContain(
      'LOCATION:https://meet.google.com/abc-defg-hij',
    )
    const pending = renderBookingEmail(notice({ location: meet }), 'en')
    expect(pending.html).not.toContain('meet.google.com')
  })

  it('renders a confirmation with the time, place, link and an invite', () => {
    const email = renderBookingEmail(notice(), 'pt')
    expect(email.subject).toBe('Confirmado: Aula <1> com Ana')
    expect(email.html).toContain('Aula &lt;1&gt;')
    expect(email.html).toContain('(America/Sao_Paulo)')
    expect(email.html).toContain('Online: https://meet.test/ana')
    expect(email.html).toContain('Remarcar ou cancelar')
    expect(email.ics).toContain('METHOD:PUBLISH')
    expect(email.ics).toContain('UID:booking-b-1@lifedeck')
    expect(email.ics).toContain('SEQUENCE:1782219600')
    expect(email.ics).toContain('DTSTART:20260623T130000Z')
    expect(email.ics).toContain('LOCATION:https://meet.test/ana')
    expect(email.ics).toContain('STATUS:CONFIRMED')
  })

  it('cancels the invite and shows the reason', () => {
    const email = renderBookingEmail(
      notice({ kind: 'cancelled', reason: 'Sick', manageUrl: null }),
      'en',
    )
    expect(email.subject).toBe('Cancelled: Aula <1> with Ana')
    expect(email.html).toContain('<strong>Note:</strong> Sick')
    expect(email.html).not.toContain('Reschedule or cancel')
    expect(email.ics).toContain('METHOD:CANCEL')
    expect(email.ics).toContain('STATUS:CANCELLED')
  })

  it('sends no invite for a pending request', () => {
    const email = renderBookingEmail(
      notice({ kind: 'requested', location: { kind: 'phone' } }),
      'es',
    )
    expect(email.subject).toBe('Solicitud recibida: Aula <1> con Ana')
    expect(email.html).toContain('Por teléfono')
    expect(email.ics).toBeNull()
  })

  it.each([
    ['rescheduled', 'New time'],
    ['declined', 'Not confirmed'],
    ['reminder', 'Coming up'],
  ] as const)('words the %s email', (kind, subject) => {
    expect(renderBookingEmail(notice({ kind }), 'en').subject).toContain(
      subject,
    )
  })

  it('names the place for in-person and online meetings', () => {
    const inPerson = renderBookingEmail(
      notice({ location: { kind: 'in-person', address: 'Rua A, 1' } }),
      'pt',
    )
    expect(inPerson.html).toContain('Presencial: Rua A, 1')
    expect(inPerson.ics).toContain('LOCATION:Rua A\\, 1')
    const meet = renderBookingEmail(
      notice({ location: { kind: 'online-meet' } }),
      'pt',
    )
    expect(meet.ics).toContain('LOCATION:Reunião online')
  })
})

describe('booking email copy', () => {
  const kinds = [
    'requested',
    'confirmed',
    'rescheduled',
    'cancelled',
    'declined',
    'reminder',
  ] as const

  it.each(['en', 'pt', 'es', 'fr', 'de', 'it'] as const)(
    'has a subject and title for every kind in %s',
    locale => {
      const subjects = kinds.map(
        kind => renderBookingEmail(notice({ kind }), locale).subject,
      )
      expect(new Set(subjects).size).toBe(kinds.length)
      for (const subject of subjects) {
        expect(subject).toContain('Ana')
      }
    },
  )
})
