/**
 * The languages Lifedeck speaks. Mirrors the i18n package's supported
 * locales, but lives in the domain so use cases can pick a reply language
 * without depending on the i18n (presentation) layer. Fallback is 'en'.
 */
export const MESSAGE_LANGUAGES = ['en', 'pt', 'es', 'fr', 'de', 'it'] as const

export type MessageLanguage = (typeof MESSAGE_LANGUAGES)[number]

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
  fr: new Set([
    'bonjour',
    'bonsoir',
    'salut',
    'merci',
    'oui',
    'tâche',
    'tâches',
    'rappel',
    'rappelle',
    'rappeler',
    'demain',
    'aujourd',
    'besoin',
    'veux',
    'faire',
    'avec',
    'pour',
    'plaît',
    'je',
    'suis',
    'est',
  ]),
  de: new Set([
    'hallo',
    'guten',
    'abend',
    'danke',
    'bitte',
    'nein',
    'aufgabe',
    'aufgaben',
    'erinnerung',
    'erinnere',
    'heute',
    'morgen',
    'brauche',
    'möchte',
    'ich',
    'und',
    'nicht',
    'ist',
    'mein',
    'mir',
  ]),
  it: new Set([
    'ciao',
    'buongiorno',
    'buonasera',
    'grazie',
    'sì',
    'attività',
    'promemoria',
    'ricorda',
    'ricordami',
    'domani',
    'oggi',
    'bisogno',
    'voglio',
    'fare',
    'sono',
    'favore',
    'anche',
    'questo',
    'ho',
  ]),
}

// Characters that only appear in one of the languages are a strong tell.
const TELLS: ReadonlyArray<[MessageLanguage, RegExp]> = [
  ['pt', /[ãõ]|ç/],
  ['es', /ñ|¿|¡/],
  ['de', /[äöüß]/],
  ['fr', /œ/],
]

/**
 * Best-effort language detection from a short free-text message, so we can reply
 * in the same language a user wrote in. Pure and dependency-free (no model
 * call), tuned for the greetings and short phrases typical of WhatsApp. Returns
 * 'en' when there is no clear signal or when two languages tie.
 */
export function detectMessageLanguage(text: string): MessageLanguage {
  const lower = text.toLowerCase()
  const score = Object.fromEntries(
    MESSAGE_LANGUAGES.map(language => [language, 0]),
  ) as Record<MessageLanguage, number>

  for (const [language, tell] of TELLS) {
    if (tell.test(lower)) score[language] += 3
  }

  const tokens = lower.match(/[\p{Letter}]+/gu) ?? []
  for (const token of tokens) {
    for (const language of MESSAGE_LANGUAGES) {
      if (WORDS[language].has(token)) score[language] += 1
    }
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
 * message languages by its base subtag, falling back to 'en'.
 */
export function toMessageLanguage(
  locale: string | null | undefined,
): MessageLanguage {
  const base = (locale ?? '').toLowerCase().slice(0, 2)
  return (
    MESSAGE_LANGUAGES.find(language => language === base) ?? DEFAULT_LANGUAGE
  )
}
