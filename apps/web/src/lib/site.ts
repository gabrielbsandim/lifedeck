export const SITE_NAME = 'Lifedeck'
export const SITE_DESCRIPTION = 'Your whole life, calmly in hand.'
export const SITE_TAGLINE = 'Plan, share and stay in control - together.'

export const COMPANY_NAME = 'GBS Tecnologia da Informação Ltda'
export const COMPANY_CNPJ = '44.000.992/0001-22'
export const COMPANY_EMAIL = 'contato@lifedeck.com.br'

export const APP_STORE_URL = 'https://apps.apple.com/app/id6838782178'
export const GOOGLE_PLAY_URL =
  'https://play.google.com/store/apps/details?id=com.lifedeck.app'

export function siteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL
  if (explicit) {
    return explicit.replace(/\/$/, '')
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`
  }
  return 'http://localhost:3000'
}
