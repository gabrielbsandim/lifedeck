import type { EmailLocale } from '@taskin/application'
import type { EmailTemplate, RenderedEmail } from '@/email/email-message'

function layout(title: string, body: string): string {
  return `<!doctype html><html><body style="font-family:system-ui,sans-serif;background:#f6f7f9;padding:24px"><div style="max-width:480px;margin:0 auto;background:#fff;border-radius:16px;padding:32px"><h1 style="font-size:20px;margin:0 0 16px">${title}</h1>${body}</div></body></html>`
}

type VerificationCopy = {
  subject: (appName: string) => string
  title: string
  intro: string
}

type InvitationCopy = {
  subject: (listTitle: string) => string
  title: string
  body: (listTitle: string, url: string) => string
}

const VERIFICATION_COPY: Record<EmailLocale, VerificationCopy> = {
  en: {
    subject: appName => `Your ${appName} verification code`,
    title: 'Confirm your email',
    intro: 'Use this code to finish signing in:',
  },
  pt: {
    subject: appName => `Seu código de verificação do ${appName}`,
    title: 'Confirme seu e-mail',
    intro: 'Use este código para concluir o acesso:',
  },
}

const INVITATION_COPY: Record<EmailLocale, InvitationCopy> = {
  en: {
    subject: listTitle => `You were invited to "${listTitle}"`,
    title: 'A list is waiting for you',
    body: (listTitle, url) =>
      `<p>You can collaborate on <strong>${listTitle}</strong>.</p><p><a href="${url}">Open the list</a></p>`,
  },
  pt: {
    subject: listTitle => `Você foi convidado para "${listTitle}"`,
    title: 'Uma lista espera por você',
    body: (listTitle, url) =>
      `<p>Você pode colaborar em <strong>${listTitle}</strong>.</p><p><a href="${url}">Abrir a lista</a></p>`,
  },
}

export function renderEmail(
  template: EmailTemplate,
  locale: EmailLocale = 'en',
): RenderedEmail {
  switch (template.type) {
    case 'verification-code': {
      const copy = VERIFICATION_COPY[locale]
      return {
        subject: copy.subject(template.data.appName),
        html: layout(
          copy.title,
          `<p>${copy.intro}</p><p style="font-size:28px;font-weight:700;letter-spacing:4px">${template.data.code}</p>`,
        ),
      }
    }
    case 'list-invitation': {
      const copy = INVITATION_COPY[locale]
      return {
        subject: copy.subject(template.data.listTitle),
        html: layout(
          copy.title,
          copy.body(template.data.listTitle, template.data.url),
        ),
      }
    }
  }
}
