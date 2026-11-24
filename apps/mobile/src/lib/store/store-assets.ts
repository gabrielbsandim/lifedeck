import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// One entry per app language. The first Play locale names the notes file the
// release writer edits; every other locale gets a copy at upload.
export type Listing = {
  app: string
  play: string[]
  apple: string[]
  name: string
  subtitle: string
  promoText: string
  shortDescription: string
  keywords: string[]
  description: string[]
}

type LimitedField =
  | 'name'
  | 'subtitle'
  | 'promoText'
  | 'shortDescription'
  | 'keywords'
  | 'description'

// The tighter of the App Store and Play limits; Apple counts the keywords
// joined by commas.
export const LISTING_LIMITS: Record<LimitedField, number> = {
  name: 30,
  subtitle: 30,
  promoText: 170,
  shortDescription: 80,
  keywords: 100,
  description: 4000,
}

export const WHATSNEW_LIMIT = 500

export type StoreFiles = {
  listings: () => Listing[]
  whatsnew: (play: string) => string | undefined
  diffExitCode: (play: string, since: string) => number
  writeWhatsnew: (dir: string, play: string, text: string) => void
}

const length = (text: string) => [...text].length

export const whatsnewFile = (play: string) =>
  `distribution/whatsnew/whatsnew-${play}`

export const primaryPlay = (listing: Listing) => listing.play[0] ?? listing.app

export function listingText(listing: Listing): Record<LimitedField, string> {
  return {
    name: listing.name,
    subtitle: listing.subtitle,
    promoText: listing.promoText,
    shortDescription: listing.shortDescription,
    keywords: listing.keywords.join(','),
    description: listing.description.join('\n'),
  }
}

function localeProblems(listing: Listing): string[] {
  return (['play', 'apple'] as const).flatMap(store =>
    listing[store].length === 0
      ? [`${listing.app} has no ${store} locale`]
      : [],
  )
}

export function listingProblems(listing: Listing): string[] {
  const text = listingText(listing)
  const fields = (Object.keys(LISTING_LIMITS) as LimitedField[]).flatMap(
    field => {
      const size = length(text[field].trim())
      if (size === 0) {
        return [`${listing.app} ${field} is blank`]
      }
      if (size > LISTING_LIMITS[field]) {
        return [
          `${listing.app} ${field} has ${size} characters, the store takes ${LISTING_LIMITS[field]}`,
        ]
      }
      return []
    },
  )
  return [...localeProblems(listing), ...fields]
}

export function whatsnewProblem(
  play: string,
  text: string | undefined,
): string | undefined {
  if (text === undefined) {
    return `whatsnew-${play} is missing`
  }
  const size = length(text.trim())
  if (size === 0) {
    return `whatsnew-${play} is blank`
  }
  if (size > WHATSNEW_LIMIT) {
    return `whatsnew-${play} has ${size} characters, Play takes ${WHATSNEW_LIMIT}`
  }
  return undefined
}

// git diff --quiet exits 1 when the file changed; anything above 1 is a git error.
export function staleProblem(
  play: string,
  since: string,
  exitCode: number,
): string | undefined {
  switch (exitCode) {
    case 0:
      return `whatsnew-${play} is unchanged since ${since}, write the notes for this release`
    case 1:
      return undefined
    default:
      return `git diff of whatsnew-${play} against ${since} failed`
  }
}

export function storeAssetProblems(
  files: StoreFiles,
  since?: string,
): string[] {
  return files.listings().flatMap(listing => {
    const play = primaryPlay(listing)
    const stale =
      since === undefined
        ? undefined
        : staleProblem(play, since, files.diffExitCode(play, since))
    return [
      ...listingProblems(listing),
      whatsnewProblem(play, files.whatsnew(play)),
      stale,
    ].filter((problem): problem is string => problem !== undefined)
  })
}

// upload-google-play reads one whatsnew-<locale> file per Play locale.
export function expandWhatsnew(files: StoreFiles, dir: string): number {
  return files.listings().reduce((written, listing) => {
    const text = files.whatsnew(primaryPlay(listing)) ?? ''
    listing.play.forEach(play => files.writeWhatsnew(dir, play, text))
    return written + listing.play.length
  }, 0)
}

export function diskFiles(root: string): StoreFiles {
  return {
    listings: () =>
      JSON.parse(
        readFileSync(path.join(root, 'distribution/listing.json'), 'utf8'),
      ) as Listing[],
    whatsnew: play => {
      const file = path.join(root, whatsnewFile(play))
      return existsSync(file) ? readFileSync(file, 'utf8') : undefined
    },
    diffExitCode: (play, since) =>
      spawnSync(
        'git',
        ['diff', '--quiet', since, 'HEAD', '--', whatsnewFile(play)],
        { cwd: root },
      ).status ?? 2,
    writeWhatsnew: (dir, play, text) => {
      mkdirSync(dir, { recursive: true })
      writeFileSync(path.join(dir, `whatsnew-${play}`), text)
    },
  }
}

type Output = { log: (line: string) => void; error: (line: string) => void }

export function runStoreCheck(
  argv: string[],
  files: StoreFiles,
  output: Output,
): number {
  const flag = argv.indexOf('--since')
  const since = flag === -1 ? undefined : argv[flag + 1]
  if (flag !== -1 && !since) {
    output.error('--since needs a git tag or ref')
    return 1
  }
  const problems = storeAssetProblems(files, since)
  if (problems.length > 0) {
    output.error(problems.join('\n'))
    return 1
  }
  const expand = argv.indexOf('--expand')
  if (expand !== -1) {
    return expandTo(files, argv[expand + 1], output)
  }
  output.log(
    `Store listing and notes are ready for ${files.listings().length} locales.`,
  )
  return 0
}

function expandTo(
  files: StoreFiles,
  dir: string | undefined,
  output: Output,
): number {
  if (!dir) {
    output.error('--expand needs a directory')
    return 1
  }
  output.log(
    `Wrote ${expandWhatsnew(files, dir)} Play release notes to ${dir}.`,
  )
  return 0
}

// Runs as `node src/lib/store/store-assets.ts`, so it imports nothing through
// the `@/` alias that only the bundler and Vitest resolve.
const entry = process.argv[1]
if (entry && path.resolve(entry) === fileURLToPath(import.meta.url)) {
  const root = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    '../../..',
  )
  process.exitCode = runStoreCheck(
    process.argv.slice(2),
    diskFiles(root),
    console,
  )
}
