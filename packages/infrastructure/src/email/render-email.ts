import type { EmailTemplate, RenderedEmail } from '@/email/email-message'

function layout(title: string, body: string): string {
  return `<!doctype html><html><body style="font-family:system-ui,sans-serif;background:#f6f7f9;padding:24px"><div style="max-width:480px;margin:0 auto;background:#fff;border-radius:16px;padding:32px"><h1 style="font-size:20px;margin:0 0 16px">${title}</h1>${body}</div></body></html>`
}

export function renderEmail(template: EmailTemplate): RenderedEmail {
  switch (template.type) {
    case 'verification-code':
      return {
        subject: `Your ${template.data.appName} verification code`,
        html: layout(
          'Confirm your email',
          `<p>Use this code to finish signing in:</p><p style="font-size:28px;font-weight:700;letter-spacing:4px">${template.data.code}</p>`,
        ),
      }
    case 'list-invitation':
      return {
        subject: `You were invited to "${template.data.listTitle}"`,
        html: layout(
          'A list is waiting for you',
          `<p>You can collaborate on <strong>${template.data.listTitle}</strong>.</p><p><a href="${template.data.url}">Open the list</a></p>`,
        ),
      }
  }
}
