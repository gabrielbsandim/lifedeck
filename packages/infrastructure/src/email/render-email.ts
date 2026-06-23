import type { EmailLocale } from '@lifedeck/application'
import type { EmailTemplate, RenderedEmail } from '@/email/email-message'

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

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

type AssignmentCopy = {
  subject: (taskTitle: string) => string
  title: string
  body: (taskTitle: string, listTitle: string) => string
}

const ASSIGNMENT_COPY: Record<EmailLocale, AssignmentCopy> = {
  en: {
    subject: taskTitle => `You were assigned "${taskTitle}"`,
    title: 'A task is yours',
    body: (taskTitle, listTitle) =>
      `<p>You were assigned <strong>${taskTitle}</strong> on <strong>${listTitle}</strong>.</p>`,
  },
  pt: {
    subject: taskTitle => `Você recebeu a tarefa "${taskTitle}"`,
    title: 'Uma tarefa é sua',
    body: (taskTitle, listTitle) =>
      `<p>Você foi designado para <strong>${taskTitle}</strong> em <strong>${listTitle}</strong>.</p>`,
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

type DigestCopy = {
  subject: string
  title: string
  summary: (completed: number, total: number) => string
  pendingLabel: string
  allDone: string
}

const DIGEST_COPY: Record<EmailLocale, DigestCopy> = {
  en: {
    subject: 'Your Lifedeck daily summary',
    title: 'Today on Lifedeck',
    summary: (completed, total) =>
      `You completed ${completed} of ${total} tasks.`,
    pendingLabel: 'Still pending:',
    allDone: 'Everything is done. Lovely work! 🎉',
  },
  pt: {
    subject: 'Seu resumo diário do Lifedeck',
    title: 'Hoje no Lifedeck',
    summary: (completed, total) =>
      `Você concluiu ${completed} de ${total} tarefas.`,
    pendingLabel: 'Ainda pendentes:',
    allDone: 'Tudo concluído. Ótimo trabalho! 🎉',
  },
}

function digestBody(
  copy: DigestCopy,
  data: { total: number; completed: number; pendingTitles: string[] },
): string {
  const summary = `<p>${copy.summary(data.completed, data.total)}</p>`
  if (data.pendingTitles.length === 0) {
    return `${summary}<p>${copy.allDone}</p>`
  }
  const items = data.pendingTitles
    .map(title => `<li>${escapeHtml(title)}</li>`)
    .join('')
  return `${summary}<p style="font-weight:600;margin-top:16px">${copy.pendingLabel}</p><ul>${items}</ul>`
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
          `<p>${copy.intro}</p><p style="font-size:28px;font-weight:700;letter-spacing:4px">${escapeHtml(template.data.code)}</p>`,
        ),
      }
    }
    case 'list-invitation': {
      const copy = INVITATION_COPY[locale]
      return {
        subject: copy.subject(template.data.listTitle),
        html: layout(
          copy.title,
          copy.body(
            escapeHtml(template.data.listTitle),
            escapeHtml(template.data.url),
          ),
        ),
      }
    }
    case 'task-assignment': {
      const copy = ASSIGNMENT_COPY[locale]
      return {
        subject: copy.subject(template.data.taskTitle),
        html: layout(
          copy.title,
          copy.body(
            escapeHtml(template.data.taskTitle),
            escapeHtml(template.data.listTitle),
          ),
        ),
      }
    }
    case 'daily-digest': {
      const copy = DIGEST_COPY[locale]
      return {
        subject: copy.subject,
        html: layout(copy.title, digestBody(copy, template.data)),
      }
    }
  }
}
