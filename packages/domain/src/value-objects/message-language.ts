/**
 * The three languages Lifedeck speaks. Mirrors the i18n package's supported
 * locales, but lives in the domain so use cases can pick a reply language
 * without depending on the i18n (presentation) layer. Fallback is 'en'.
 */
export type MessageLanguage = 'en' | 'pt' | 'es'

export const MESSAGE_LANGUAGES: readonly MessageLanguage[] = ['en', 'pt', 'es']

const DEFAULT_LANGUAGE: MessageLanguage = 'en'

// Words that strongly signal one language. Shared words (por, favor, como, que)
// are intentionally left out so they do not pull the score in two directions.
const WORDS: Record<MessageLanguage, ReadonlySet<string>> = {
  pt: new Set([
    'oi',
    'ola',
    'olá',
    'bom',
    'dia',
    'boa',
    'tarde',
    'noite',
    'obrigado',
    'obrigada',
    'voce',
    'você',
    'nao',
    'não',
    'sim',
    'tarefa',
    'tarefas',
    'lembrete',
    'lembrar',
    'favor',
    'isso',
    'esta',
    'está',
    'estou',
    'fazer',
    'preciso',
    'quero',
    'amanha',
    'amanhã',
    'hoje',
    'entao',
    'então',
    'valeu',
  ]),
  es: new Set([
    'hola',
    'buenos',
    'buenas',
    'dias',
    'días',
    'gracias',
    'tarea',
    'tareas',
    'recordatorio',
    'recordar',
    'sí',
    'hacer',
    'necesito',
    'quiero',
    'manana',
    'mañana',
    'hoy',
    'ayuda',
    'vale',
    'entonces',
    'estoy',
    'esta',
    'está',
  ]),
  en: new Set([
    'hi',
    'hello',
    'hey',
    'good',
    'morning',
    'evening',
    'thanks',
    'thank',
    'you',
    'task',
    'tasks',
    'reminder',
    'remind',
    'please',
    'yes',
    'today',
    'tomorrow',
    'need',
    'want',
    'can',
    'the',
    'and',
    'my',
    'me',
  ]),
}

/**
 * Best-effort language detection from a short free-text message, so we can reply
 * in the same language a user wrote in. Pure and dependency-free (no model
 * call), tuned for the greetings and short phrases typical of WhatsApp. Returns
 * 'en' when there is no clear signal or when two languages tie.
 */
export function detectMessageLanguage(text: string): MessageLanguage {
  const lower = text.toLowerCase()
  const score: Record<MessageLanguage, number> = { en: 0, pt: 0, es: 0 }

  // Characters that only appear in one of the three languages are a strong tell.
  if (/[ãõ]|ç/.test(lower)) score.pt += 3
  if (/ñ|¿|¡/.test(lower)) score.es += 3

  const tokens = lower.match(/[\p{Letter}]+/gu) ?? []
  for (const token of tokens) {
    if (WORDS.pt.has(token)) score.pt += 1
    if (WORDS.es.has(token)) score.es += 1
    if (WORDS.en.has(token)) score.en += 1
  }

  const best = MESSAGE_LANGUAGES.reduce((a, b) => (score[b] > score[a] ? b : a))
  if (score[best] === 0) return DEFAULT_LANGUAGE
  const tied = MESSAGE_LANGUAGES.some(
    l => l !== best && score[l] === score[best],
  )
  return tied ? DEFAULT_LANGUAGE : best
}

/**
 * Coerce a stored locale string (e.g. a user's saved preference) to one of the
 * three message languages, falling back to 'en'.
 */
export function toMessageLanguage(
  locale: string | null | undefined,
): MessageLanguage {
  const tag = (locale ?? '').toLowerCase()
  if (tag.startsWith('pt')) return 'pt'
  if (tag.startsWith('es')) return 'es'
  return DEFAULT_LANGUAGE
}
