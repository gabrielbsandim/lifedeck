// Matching a phrase the user typed against something they already track.
//
// The assistant kept getting this wrong in the ways only a real conversation
// exposes: "eu treinei ontem" has to reach the habit "Treinar", and "passeamos
// com a Rhaenyra" has to reach the task "Passear com Rhaenyra" instead of
// creating a second copy of it. Both are the same problem, a conjugated verb and
// a couple of filler words away from the stored title, so the matching lives here
// once and both callers share it.
//
// Deliberately simple: normalize, drop filler words, and treat two words as the
// same when they share a long enough prefix (which is what Portuguese and Spanish
// conjugation leaves intact). No stemmer, no fuzzy distance: those bring false
// matches that would silently act on the wrong item.

// Articles, prepositions and pronouns across the three languages the assistant
// speaks. They carry no signal and would otherwise match everything.
const STOPWORDS = new Set([
  // pt
  'com',
  'para',
  'pra',
  'por',
  'dos',
  'das',
  'nos',
  'nas',
  'uma',
  'uns',
  'umas',
  'meu',
  'minha',
  'seu',
  'sua',
  'que',
  'hoje',
  'ontem',
  'amanha',
  // en
  'the',
  'and',
  'for',
  'with',
  'was',
  'were',
  'have',
  'had',
  'his',
  'her',
  'our',
  'their',
  'today',
  'yesterday',
  'tomorrow',
  // es
  'con',
  'los',
  'las',
  'una',
  'unos',
  'unas',
  'mi',
  'mis',
  'tu',
  'sus',
  'hoy',
  'ayer',
  'manana',
])

// Shortest shared prefix that still means "same word": "trein|ei" vs "trein|ar",
// "passe|amos" vs "passe|ar". Four is too loose (it merges unrelated stems).
const MIN_SHARED_PREFIX = 5
// Below this a token is noise ("ir", "ao", "de") even when not a stopword.
const MIN_TOKEN_LENGTH = 3

export function normalizeTitle(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function titleTokens(value: string): string[] {
  return normalizeTitle(value)
    .split(' ')
    .filter(token => token.length >= MIN_TOKEN_LENGTH && !STOPWORDS.has(token))
}

function tokensMatch(a: string, b: string): boolean {
  if (a === b) {
    return true
  }
  const shorter = a.length <= b.length ? a : b
  const longer = a.length <= b.length ? b : a
  if (shorter.length >= MIN_SHARED_PREFIX && longer.startsWith(shorter)) {
    return true
  }
  return (
    shorter.length >= MIN_SHARED_PREFIX &&
    a.slice(0, MIN_SHARED_PREFIX) === b.slice(0, MIN_SHARED_PREFIX)
  )
}

/**
 * How strongly two titles refer to the same thing: the number of words of the
 * query that find a partner in the candidate. 0 means unrelated.
 */
export function titleMatchScore(query: string, candidate: string): number {
  if (normalizeTitle(query) === normalizeTitle(candidate)) {
    return Number.MAX_SAFE_INTEGER
  }
  const candidateTokens = titleTokens(candidate)
  const taken = new Set<number>()
  let score = 0
  for (const token of titleTokens(query)) {
    const index = candidateTokens.findIndex(
      (other, i) => !taken.has(i) && tokensMatch(token, other),
    )
    if (index >= 0) {
      taken.add(index)
      score += 1
    }
  }
  return score
}

/**
 * The candidate the phrase most likely refers to, or null when none is related.
 * Ties keep the first candidate, so callers should pass them in the order the
 * user would expect (today's board order, habit order).
 */
export function findBestTitleMatch<T>(
  candidates: readonly T[],
  query: string,
  titleOf: (candidate: T) => string,
): T | null {
  let best: T | null = null
  let bestScore = 0
  for (const candidate of candidates) {
    const score = titleMatchScore(query, titleOf(candidate))
    if (score > bestScore) {
      best = candidate
      bestScore = score
    }
  }
  return best
}

/** True when two titles are the same once case, accents and punctuation are ignored. */
export function isSameTitle(a: string, b: string): boolean {
  return normalizeTitle(a) === normalizeTitle(b)
}
