import { describe, expect, it } from 'vitest'
import { renderEmail } from '@/email/render-email'

describe('renderEmail', () => {
  it('renders a verification code email', () => {
    const email = renderEmail({
      type: 'verification-code',
      data: { code: '123456', appName: 'Lifedeck' },
    })
    expect(email.subject).toBe('Your Lifedeck verification code')
    expect(email.html).toContain('123456')
  })

  it('renders a list invitation email', () => {
    const email = renderEmail({
      type: 'list-invitation',
      data: { listTitle: 'Wedding steps', url: 'https://lifedeck.app/s/abc' },
    })
    expect(email.subject).toContain('Wedding steps')
    expect(email.html).toContain('https://lifedeck.app/s/abc')
  })

  it('renders the verification email in Portuguese', () => {
    const email = renderEmail(
      {
        type: 'verification-code',
        data: { code: '123456', appName: 'Lifedeck' },
      },
      'pt',
    )
    expect(email.subject).toBe('Seu código de verificação do Lifedeck')
    expect(email.html).toContain('Confirme seu e-mail')
    expect(email.html).toContain('123456')
  })

  it('renders the invitation email in Portuguese', () => {
    const email = renderEmail(
      {
        type: 'list-invitation',
        data: { listTitle: 'Casamento', url: 'https://lifedeck.app/s/abc' },
      },
      'pt',
    )
    expect(email.subject).toContain('Casamento')
    expect(email.html).toContain('Abrir a lista')
  })

  it('escapes HTML in user-controlled fields', () => {
    const email = renderEmail({
      type: 'task-assignment',
      data: {
        taskTitle: '<script>alert(1)</script>',
        listTitle: 'Wedding',
      },
    })
    expect(email.html).not.toContain('<script>')
    expect(email.html).toContain('&lt;script&gt;')
  })

  it('renders a daily digest with pending tasks', () => {
    const email = renderEmail({
      type: 'daily-digest',
      data: {
        date: '2026-06-22',
        total: 3,
        completed: 1,
        pendingTitles: ['Choose cake', 'Send invitations'],
      },
    })
    expect(email.subject).toBe('Your Lifedeck daily summary')
    expect(email.html).toContain('Choose cake')
    expect(email.html).toContain('Still pending:')
  })

  it('renders an event reminder with a formatted time', () => {
    const email = renderEmail({
      type: 'event-reminder',
      data: { eventTitle: 'Dentist', startsAt: '2026-06-25T09:00:00.000Z' },
    })
    expect(email.subject).toBe('Reminder: Dentist')
    expect(email.html).toContain('Dentist')
    expect(email.html).toContain('Upcoming event')
  })

  it('renders an event reminder in the user timezone', () => {
    const email = renderEmail({
      type: 'event-reminder',
      data: {
        eventTitle: 'Dentist',
        startsAt: '2026-06-25T12:00:00.000Z',
        timeZone: 'America/Sao_Paulo',
      },
    })
    // 12:00 UTC is 09:00 in Sao Paulo (UTC-3, no DST).
    expect(email.html).toContain('9:00')
  })

  it('falls back to UTC for an invalid timezone', () => {
    const email = renderEmail({
      type: 'event-reminder',
      data: {
        eventTitle: 'Dentist',
        startsAt: '2026-06-25T12:00:00.000Z',
        timeZone: 'Not/AZone',
      },
    })
    expect(email.subject).toBe('Reminder: Dentist')
    expect(email.html).toContain('12:00')
  })

  it('falls back to the raw value for an unparseable reminder time', () => {
    const email = renderEmail(
      {
        type: 'event-reminder',
        data: { eventTitle: 'Reunião', startsAt: 'not-a-date' },
      },
      'pt',
    )
    expect(email.subject).toBe('Lembrete: Reunião')
    expect(email.html).toContain('not-a-date')
  })

  it('renders a daily digest celebrating an empty pending list in pt', () => {
    const email = renderEmail(
      {
        type: 'daily-digest',
        data: { date: '2026-06-22', total: 2, completed: 2, pendingTitles: [] },
      },
      'pt',
    )
    expect(email.subject).toBe('Seu resumo diário do Lifedeck')
    expect(email.html).toContain('Tudo concluído')
  })

  it('renders every template in Spanish', () => {
    const verification = renderEmail(
      {
        type: 'verification-code',
        data: { code: '123456', appName: 'Lifedeck' },
      },
      'es',
    )
    expect(verification.subject).toBe('Tu código de verificación de Lifedeck')
    expect(verification.html).toContain('Confirma tu correo')

    const invitation = renderEmail(
      {
        type: 'list-invitation',
        data: { listTitle: 'Boda', url: 'https://lifedeck.app/s/abc' },
      },
      'es',
    )
    expect(invitation.subject).toContain('Boda')
    expect(invitation.html).toContain('Abrir la lista')

    const assignment = renderEmail(
      {
        type: 'task-assignment',
        data: { taskTitle: 'Reservar lugar', listTitle: 'Boda' },
      },
      'es',
    )
    expect(assignment.subject).toContain('Reservar lugar')
    expect(assignment.html).toContain('Una tarea es tuya')

    const digest = renderEmail(
      {
        type: 'daily-digest',
        data: {
          date: '2026-06-22',
          total: 3,
          completed: 1,
          pendingTitles: ['Elegir pastel'],
        },
      },
      'es',
    )
    expect(digest.subject).toBe('Tu resumen diario de Lifedeck')
    expect(digest.html).toContain('Aún pendientes:')
  })

  it('renders a task assignment email (en and pt)', () => {
    const en = renderEmail({
      type: 'task-assignment',
      data: { taskTitle: 'Book venue', listTitle: 'Wedding' },
    })
    expect(en.subject).toContain('Book venue')
    expect(en.html).toContain('Wedding')

    const pt = renderEmail(
      {
        type: 'task-assignment',
        data: { taskTitle: 'Reservar local', listTitle: 'Casamento' },
      },
      'pt',
    )
    expect(pt.subject).toContain('Reservar local')
    expect(pt.html).toContain('Casamento')
  })
})
