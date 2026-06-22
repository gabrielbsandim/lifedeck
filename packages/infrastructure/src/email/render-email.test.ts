import { describe, expect, it } from 'vitest'
import { renderEmail } from '@/email/render-email'

describe('renderEmail', () => {
  it('renders a verification code email', () => {
    const email = renderEmail({
      type: 'verification-code',
      data: { code: '123456', appName: 'TaskIn' },
    })
    expect(email.subject).toBe('Your TaskIn verification code')
    expect(email.html).toContain('123456')
  })

  it('renders a list invitation email', () => {
    const email = renderEmail({
      type: 'list-invitation',
      data: { listTitle: 'Wedding steps', url: 'https://taskin.app/s/abc' },
    })
    expect(email.subject).toContain('Wedding steps')
    expect(email.html).toContain('https://taskin.app/s/abc')
  })

  it('renders the verification email in Portuguese', () => {
    const email = renderEmail(
      {
        type: 'verification-code',
        data: { code: '123456', appName: 'TaskIn' },
      },
      'pt',
    )
    expect(email.subject).toBe('Seu código de verificação do TaskIn')
    expect(email.html).toContain('Confirme seu e-mail')
    expect(email.html).toContain('123456')
  })

  it('renders the invitation email in Portuguese', () => {
    const email = renderEmail(
      {
        type: 'list-invitation',
        data: { listTitle: 'Casamento', url: 'https://taskin.app/s/abc' },
      },
      'pt',
    )
    expect(email.subject).toContain('Casamento')
    expect(email.html).toContain('Abrir a lista')
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
    expect(email.subject).toBe('Your TaskIn daily summary')
    expect(email.html).toContain('Choose cake')
    expect(email.html).toContain('Still pending:')
  })

  it('renders a daily digest celebrating an empty pending list in pt', () => {
    const email = renderEmail(
      {
        type: 'daily-digest',
        data: { date: '2026-06-22', total: 2, completed: 2, pendingTitles: [] },
      },
      'pt',
    )
    expect(email.subject).toBe('Seu resumo diário do TaskIn')
    expect(email.html).toContain('Tudo concluído')
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
