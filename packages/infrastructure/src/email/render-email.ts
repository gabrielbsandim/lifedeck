import { formatEventTime, type EmailLocale } from '@lifedeck/application'
import type { EmailTemplate, RenderedEmail } from '@/email/email-message'

const BRAND = {
  primary: '#6d4ae6',
  violet: '#8b5cf6',
  ink: '#1f2430',
  body: '#555b66',
  muted: '#8a8f9a',
  divider: '#eef0f3',
  pageBg: '#f3f4f7',
  codeBg: '#f1ecfd',
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export const LINK_FALLBACK: Record<EmailLocale, string> = {
  en: 'If the button does not work, paste this link into your browser:',
  pt: 'Se o botão não funcionar, copie e cole este link no navegador:',
  es: 'Si el botón no funciona, copia y pega este enlace en tu navegador:',
  fr: 'Si le bouton ne fonctionne pas, copie ce lien dans ton navigateur :',
  de: 'Falls der Button nicht funktioniert, kopiere diesen Link in deinen Browser:',
  it: 'Se il pulsante non funziona, copia e incolla questo link nel browser:',
}

type FooterCopy = { automated: string; tagline: string }

const FOOTER_COPY: Record<EmailLocale, FooterCopy> = {
  en: {
    automated: 'This is an automated email, no need to reply.',
    tagline: 'Your whole life, organized in one place.',
  },
  pt: {
    automated: 'Este é um e-mail automático, não precisa responder.',
    tagline: 'Sua vida inteira, organizada num só lugar.',
  },
  es: {
    automated: 'Este es un correo automático, no necesitas responder.',
    tagline: 'Toda tu vida, organizada en un solo lugar.',
  },
  fr: {
    automated: 'Ceci est un e-mail automatique, inutile d’y répondre.',
    tagline: 'Toute ta vie, organisée en un seul endroit.',
  },
  de: {
    automated: 'Dies ist eine automatische E-Mail, bitte nicht antworten.',
    tagline: 'Dein ganzes Leben, an einem Ort organisiert.',
  },
  it: {
    automated: 'Questa è un’email automatica, non serve rispondere.',
    tagline: 'Tutta la tua vita, organizzata in un unico posto.',
  },
}

export function layout(
  title: string,
  body: string,
  locale: EmailLocale,
): string {
  const footer = FOOTER_COPY[locale]
  const year = new Date().getFullYear()
  return `<!doctype html><html lang="${locale}"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width, initial-scale=1.0"/><title>${escapeHtml(
    title,
  )}</title></head><body style="margin:0;padding:0;background-color:${BRAND.pageBg};font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${BRAND.pageBg}"><tr><td align="center" style="padding:40px 16px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 10px rgba(40,30,70,0.08)">
<tr><td style="height:4px;background:${BRAND.primary};background:linear-gradient(90deg,${BRAND.primary} 0%,${BRAND.violet} 100%);font-size:0;line-height:0">&nbsp;</td></tr>
<tr><td align="center" style="padding:30px 24px 6px">
<table role="presentation" cellpadding="0" cellspacing="0" align="center"><tr>
<td style="vertical-align:middle"><span style="display:inline-block;width:34px;height:34px;border-radius:10px;background:${BRAND.primary};color:#ffffff;font-size:19px;line-height:34px;text-align:center;font-weight:700">&#10003;</span></td>
<td style="vertical-align:middle;padding-left:10px;font-size:20px;font-weight:700;letter-spacing:-0.02em;color:${BRAND.ink}">Lifedeck</td>
</tr></table>
</td></tr>
<tr><td style="padding:18px 32px 8px">
<h1 style="margin:0 0 16px;font-size:22px;font-weight:700;color:${BRAND.ink}">${title}</h1>
${body}
</td></tr>
<tr><td align="center" style="padding:24px 32px 30px">
<hr style="border:none;border-top:1px solid ${BRAND.divider};margin:0 0 18px"/>
<p style="margin:0 0 4px;font-size:12px;color:#b0b5bf">© ${year} Lifedeck · ${escapeHtml(
    footer.tagline,
  )}</p>
<p style="margin:0;font-size:12px;color:#b0b5bf">${escapeHtml(
    footer.automated,
  )}</p>
</td></tr>
</table>
</td></tr></table>
</body></html>`
}

export function paragraph(html: string): string {
  return `<p style="margin:0 0 18px;font-size:15px;line-height:1.6;color:${BRAND.body}">${html}</p>`
}

export function button(url: string, label: string, fallback: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" width="100%"><tr><td align="center" style="padding:6px 0 24px"><a href="${url}" target="_blank" style="display:inline-block;background-color:${BRAND.primary};color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;padding:14px 40px;border-radius:10px;line-height:1">${escapeHtml(
    label,
  )}</a></td></tr></table><p style="margin:0 0 6px;font-size:13px;line-height:1.5;color:${BRAND.muted}">${escapeHtml(
    fallback,
  )}</p><p style="margin:0;font-size:13px;line-height:1.5;word-break:break-all"><a href="${url}" style="color:${BRAND.primary};text-decoration:underline">${url}</a></p>`
}

function codeBox(code: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" width="100%"><tr><td align="center" style="padding:4px 0 8px"><div style="display:inline-block;background:${BRAND.codeBg};border-radius:12px;padding:16px 28px;font-size:30px;font-weight:700;letter-spacing:8px;color:${BRAND.primary}">${escapeHtml(
    code,
  )}</div></td></tr></table>`
}

type VerificationCopy = {
  subject: (appName: string) => string
  title: string
  intro: string
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
  es: {
    subject: appName => `Tu código de verificación de ${appName}`,
    title: 'Confirma tu correo',
    intro: 'Usa este código para completar el acceso:',
  },
  fr: {
    subject: appName => `Ton code de vérification ${appName}`,
    title: 'Confirme ton e-mail',
    intro: 'Utilise ce code pour terminer la connexion :',
  },
  de: {
    subject: appName => `Dein ${appName}-Bestätigungscode`,
    title: 'Bestätige deine E-Mail',
    intro: 'Gib diesen Code ein, um die Anmeldung abzuschließen:',
  },
  it: {
    subject: appName => `Il tuo codice di verifica ${appName}`,
    title: 'Conferma la tua email',
    intro: 'Usa questo codice per completare l’accesso:',
  },
}

type InvitationCopy = {
  subject: (listTitle: string) => string
  title: string
  intro: (listTitle: string) => string
  cta: string
}

const INVITATION_COPY: Record<EmailLocale, InvitationCopy> = {
  en: {
    subject: listTitle => `You were invited to "${listTitle}"`,
    title: 'A list is waiting for you',
    intro: listTitle => `You can collaborate on <strong>${listTitle}</strong>.`,
    cta: 'Open the list',
  },
  pt: {
    subject: listTitle => `Você foi convidado para "${listTitle}"`,
    title: 'Uma lista espera por você',
    intro: listTitle => `Você pode colaborar em <strong>${listTitle}</strong>.`,
    cta: 'Abrir a lista',
  },
  es: {
    subject: listTitle => `Te invitaron a "${listTitle}"`,
    title: 'Una lista te espera',
    intro: listTitle => `Puedes colaborar en <strong>${listTitle}</strong>.`,
    cta: 'Abrir la lista',
  },
  fr: {
    subject: listTitle => `Tu as été invité à "${listTitle}"`,
    title: 'Une liste t’attend',
    intro: listTitle => `Tu peux collaborer sur <strong>${listTitle}</strong>.`,
    cta: 'Ouvrir la liste',
  },
  de: {
    subject: listTitle => `Du wurdest zu "${listTitle}" eingeladen`,
    title: 'Eine Liste wartet auf dich',
    intro: listTitle =>
      `Du kannst an <strong>${listTitle}</strong> mitarbeiten.`,
    cta: 'Liste öffnen',
  },
  it: {
    subject: listTitle => `Sei stato invitato a "${listTitle}"`,
    title: 'Una lista ti aspetta',
    intro: listTitle => `Puoi collaborare a <strong>${listTitle}</strong>.`,
    cta: 'Apri la lista',
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
      `You were assigned <strong>${taskTitle}</strong> on <strong>${listTitle}</strong>.`,
  },
  pt: {
    subject: taskTitle => `Você recebeu a tarefa "${taskTitle}"`,
    title: 'Uma tarefa é sua',
    body: (taskTitle, listTitle) =>
      `Você foi designado para <strong>${taskTitle}</strong> em <strong>${listTitle}</strong>.`,
  },
  es: {
    subject: taskTitle => `Se te asignó "${taskTitle}"`,
    title: 'Una tarea es tuya',
    body: (taskTitle, listTitle) =>
      `Se te asignó <strong>${taskTitle}</strong> en <strong>${listTitle}</strong>.`,
  },
  fr: {
    subject: taskTitle => `"${taskTitle}" t’a été attribuée`,
    title: 'Une tâche pour toi',
    body: (taskTitle, listTitle) =>
      `<strong>${taskTitle}</strong> t’a été attribuée dans <strong>${listTitle}</strong>.`,
  },
  de: {
    subject: taskTitle => `Dir wurde "${taskTitle}" zugewiesen`,
    title: 'Eine Aufgabe für dich',
    body: (taskTitle, listTitle) =>
      `Dir wurde <strong>${taskTitle}</strong> in <strong>${listTitle}</strong> zugewiesen.`,
  },
  it: {
    subject: taskTitle => `Ti è stata assegnata "${taskTitle}"`,
    title: 'Un’attività per te',
    body: (taskTitle, listTitle) =>
      `Ti è stata assegnata <strong>${taskTitle}</strong> in <strong>${listTitle}</strong>.`,
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
  es: {
    subject: 'Tu resumen diario de Lifedeck',
    title: 'Hoy en Lifedeck',
    summary: (completed, total) =>
      `Completaste ${completed} de ${total} tareas.`,
    pendingLabel: 'Aún pendientes:',
    allDone: 'Todo completado. ¡Buen trabajo! 🎉',
  },
  fr: {
    subject: 'Ton résumé quotidien Lifedeck',
    title: 'Aujourd’hui sur Lifedeck',
    summary: (completed, total) =>
      `Tu as terminé ${completed} tâches sur ${total}.`,
    pendingLabel: 'Encore en attente :',
    allDone: 'Tout est fait. Bravo ! 🎉',
  },
  de: {
    subject: 'Deine tägliche Lifedeck-Zusammenfassung',
    title: 'Heute bei Lifedeck',
    summary: (completed, total) =>
      `Du hast ${completed} von ${total} Aufgaben erledigt.`,
    pendingLabel: 'Noch offen:',
    allDone: 'Alles erledigt. Super gemacht! 🎉',
  },
  it: {
    subject: 'Il tuo riepilogo giornaliero di Lifedeck',
    title: 'Oggi su Lifedeck',
    summary: (completed, total) =>
      `Hai completato ${completed} attività su ${total}.`,
    pendingLabel: 'Ancora in sospeso:',
    allDone: 'Tutto fatto. Ottimo lavoro! 🎉',
  },
}

type ReminderCopy = {
  subject: (title: string) => string
  title: string
  body: (title: string, when: string) => string
}

const REMINDER_COPY: Record<EmailLocale, ReminderCopy> = {
  en: {
    subject: title => `Reminder: ${title}`,
    title: 'Upcoming event',
    body: (title, when) => `<strong>${title}</strong> starts at ${when}.`,
  },
  pt: {
    subject: title => `Lembrete: ${title}`,
    title: 'Evento em breve',
    body: (title, when) => `<strong>${title}</strong> começa às ${when}.`,
  },
  es: {
    subject: title => `Recordatorio: ${title}`,
    title: 'Evento próximo',
    body: (title, when) => `<strong>${title}</strong> comienza a las ${when}.`,
  },
  fr: {
    subject: title => `Rappel : ${title}`,
    title: 'Événement à venir',
    body: (title, when) => `<strong>${title}</strong> commence à ${when}.`,
  },
  de: {
    subject: title => `Erinnerung: ${title}`,
    title: 'Anstehender Termin',
    body: (title, when) => `<strong>${title}</strong> beginnt um ${when}.`,
  },
  it: {
    subject: title => `Promemoria: ${title}`,
    title: 'Evento in arrivo',
    body: (title, when) => `<strong>${title}</strong> inizia alle ${when}.`,
  },
}

function digestBody(
  copy: DigestCopy,
  data: { total: number; completed: number; pendingTitles: string[] },
): string {
  const summary = paragraph(copy.summary(data.completed, data.total))
  if (data.pendingTitles.length === 0) {
    return `${summary}${paragraph(copy.allDone)}`
  }
  const items = data.pendingTitles
    .map(
      title =>
        `<li style="margin:0 0 8px;font-size:15px;line-height:1.5;color:${BRAND.ink}">${escapeHtml(
          title,
        )}</li>`,
    )
    .join('')
  return `${summary}<p style="margin:0 0 10px;font-size:14px;font-weight:600;color:${BRAND.ink}">${copy.pendingLabel}</p><ul style="margin:0 0 8px;padding-left:20px">${items}</ul>`
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
          `${paragraph(copy.intro)}${codeBox(template.data.code)}`,
          locale,
        ),
      }
    }
    case 'list-invitation': {
      const copy = INVITATION_COPY[locale]
      return {
        subject: copy.subject(template.data.listTitle),
        html: layout(
          copy.title,
          `${paragraph(
            copy.intro(escapeHtml(template.data.listTitle)),
          )}${button(
            escapeHtml(template.data.url),
            copy.cta,
            LINK_FALLBACK[locale],
          )}`,
          locale,
        ),
      }
    }
    case 'task-assignment': {
      const copy = ASSIGNMENT_COPY[locale]
      return {
        subject: copy.subject(template.data.taskTitle),
        html: layout(
          copy.title,
          paragraph(
            copy.body(
              escapeHtml(template.data.taskTitle),
              escapeHtml(template.data.listTitle),
            ),
          ),
          locale,
        ),
      }
    }
    case 'daily-digest': {
      const copy = DIGEST_COPY[locale]
      return {
        subject: copy.subject,
        html: layout(copy.title, digestBody(copy, template.data), locale),
      }
    }
    case 'event-reminder': {
      const copy = REMINDER_COPY[locale]
      const when = formatEventTime(
        template.data.startsAt,
        locale,
        template.data.timeZone ?? 'UTC',
      )
      return {
        subject: copy.subject(template.data.eventTitle),
        html: layout(
          copy.title,
          paragraph(
            copy.body(escapeHtml(template.data.eventTitle), escapeHtml(when)),
          ),
          locale,
        ),
      }
    }
  }
}
