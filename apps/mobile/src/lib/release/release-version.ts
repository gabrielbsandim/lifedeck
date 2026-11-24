import { spawnSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

export const USAGE = `node src/lib/release/release-version.ts [--bump auto|patch|minor|major]
    [--version X.Y.Z] [--notes-file <path>] [--write]

Derives the next app version and its notes from the Conventional Commits since
the last v* tag that change what ships in the app, and prints a JSON summary.
--write also sets that version in app.json. Exits 2 when no such commit exists
and 3 when there is no tag yet and no --version to start from.`

const SECTIONS: readonly (readonly [string, string])[] = [
  ['feat', 'Features'],
  ['fix', 'Bug Fixes'],
  ['perf', 'Performance'],
  ['refactor', 'Refactoring'],
  ['docs', 'Documentation'],
  ['build', 'Build & Dependencies'],
  ['ci', 'CI/CD'],
  ['test', 'Tests'],
  ['style', 'Styling'],
  ['chore', 'Chores'],
  ['revert', 'Reverts'],
]

export const BUMPS = ['auto', 'patch', 'minor', 'major'] as const
export type Bump = (typeof BUMPS)[number]

// Relative to apps/mobile. Store copy, tests and coverage change no install, so
// a commit that only touches them is not an app release.
export const APP_PATHS = [
  '.',
  ':(exclude)distribution',
  ':(exclude)store.config.js',
  ':(exclude)coverage',
  ':(glob,exclude)**/*.test.ts',
  ':(glob,exclude)**/*.test.tsx',
  '../../packages/application',
  '../../packages/client',
  '../../packages/domain',
  '../../packages/i18n',
]

// The bump commit and the release merge sit inside the next range; listing them
// would make every release note mention the previous release.
const BOOKKEEPING = /^(?:build: release|release:) v\d+\.\d+\.\d+(?: \(#\d+\))?$/
const SUBJECT =
  /^(?<type>[a-z]+)(?:\((?<scope>[^)]*)\))?(?<bang>!)?: (?<rest>.+)$/
const BREAKING_IN_BODY = /^BREAKING[ -]CHANGE:/m
const BARE_VERSION = /^\d+\.\d+\.\d+$/
const APP_VERSION = /("version":\s*")(\d+\.\d+\.\d+)(")/

export type Commit = {
  hash: string
  subject: string
  description: string
  type?: string
  scope?: string
  breaking: boolean
}

export function parseCommit(record: string): Commit {
  const [hash = '', subject = '', body = ''] = record.split('\x1f')
  const match = SUBJECT.exec(subject)?.groups
  if (!match) {
    return { hash, subject, description: subject, breaking: false }
  }
  return {
    hash,
    subject,
    description: match.rest ?? subject,
    type: match.type,
    scope: match.scope,
    breaking: match.bang !== undefined || BREAKING_IN_BODY.test(body),
  }
}

export function parseLog(raw: string): Commit[] {
  return raw
    .split('\x1e')
    .map(record => record.replace(/^\n/, ''))
    .filter(record => record.length > 0)
    .map(parseCommit)
    .filter(commit => !BOOKKEEPING.test(commit.subject))
}

export function detectBump(commits: Commit[]): Exclude<Bump, 'auto'> {
  if (commits.some(commit => commit.breaking)) {
    return 'major'
  }
  return commits.some(commit => commit.type === 'feat') ? 'minor' : 'patch'
}

// 0.x reads a breaking change as a minor, so 1.0.0 stays a decision rather than
// the side effect of a stray `!`.
export function applyBump(version: string, bump: Exclude<Bump, 'auto'>) {
  const [major = 0, minor = 0, patch = 0] = version.split('.').map(Number)
  const effective = bump === 'major' && major === 0 ? 'minor' : bump
  switch (effective) {
    case 'major':
      return `${major + 1}.0.0`
    case 'minor':
      return `${major}.${minor + 1}.0`
    default:
      return `${major}.${minor}.${patch + 1}`
  }
}

const line = (commit: Commit) => {
  const prefix = commit.scope ? `**${commit.scope}:** ` : ''
  return `- ${prefix}${commit.description} (${commit.hash.slice(0, 7)})`
}

const section = (heading: string, commits: Commit[]) =>
  commits.length === 0 ? [] : [`### ${heading}`, '', ...commits.map(line), '']

export function renderNotes(
  commits: Commit[],
  version: string,
  previous: string | undefined,
): string {
  if (previous === undefined) {
    return `## v${version}\n\nFirst store release.\n`
  }
  const known = new Set(SECTIONS.map(([type]) => type))
  const unbroken = commits.filter(commit => !commit.breaking)
  return [
    `## v${version}`,
    '',
    ...section(
      'Breaking Changes',
      commits.filter(commit => commit.breaking),
    ),
    ...SECTIONS.flatMap(([type, heading]) =>
      section(
        heading,
        unbroken.filter(commit => commit.type === type),
      ),
    ),
    ...section(
      'Uncategorised',
      unbroken.filter(commit => !known.has(commit.type ?? '')),
    ),
    `**Full diff:** \`v${previous}\`...\`v${version}\``,
    '',
  ].join('\n')
}

export function readAppVersion(appJson: string): string {
  const version = (JSON.parse(appJson) as { expo?: { version?: unknown } }).expo
    ?.version
  if (typeof version !== 'string' || !BARE_VERSION.test(version)) {
    throw new Error('app.json has no expo.version in X.Y.Z form.')
  }
  return version
}

// A text edit rather than a JSON rewrite, so the file keeps the layout
// Prettier gave it.
export function withAppVersion(appJson: string, version: string): string {
  const next = appJson.replace(APP_VERSION, `$1${version}$3`)
  if (readAppVersion(next) !== version) {
    throw new Error('The first "version" in app.json is not expo.version.')
  }
  return next
}

export type Repo = {
  lastTag: () => string | undefined
  log: (range: string) => string
  readAppJson: () => string
  writeAppJson: (text: string) => void
  writeFile: (file: string, text: string) => void
}

type Output = { log: (line: string) => void; error: (line: string) => void }

type Options = {
  bump: Bump
  pinned?: string
  notesFile?: string
  write: boolean
}

export function parseOptions(argv: string[]): Options | string {
  const value = (name: string) => {
    const index = argv.indexOf(`--${name}`)
    return index === -1 ? undefined : (argv[index + 1] ?? '')
  }
  const bump = value('bump') ?? 'auto'
  if (!(BUMPS as readonly string[]).includes(bump)) {
    return `Unknown --bump "${bump}". Use ${BUMPS.join(', ')}.`
  }
  const pinned = value('version')
  if (pinned !== undefined && !BARE_VERSION.test(pinned)) {
    return `--version "${pinned}" is not a bare X.Y.Z version.`
  }
  const notesFile = value('notes-file')
  if (notesFile === '') {
    return '--notes-file needs a path.'
  }
  return {
    bump: bump as Bump,
    pinned,
    notesFile,
    write: argv.includes('--write'),
  }
}

export function runReleaseVersion(
  argv: string[],
  repo: Repo,
  output: Output,
): number {
  if (argv.includes('--help')) {
    output.log(USAGE)
    return 0
  }
  const options = parseOptions(argv)
  if (typeof options === 'string') {
    output.error(options)
    return 1
  }
  const current = readAppVersion(repo.readAppJson())
  const tag = repo.lastTag()
  if (tag === undefined && options.pinned === undefined) {
    output.error(
      `No v* tag yet, so there is no range to read. Pass --version for the first release (app.json is at ${current}).`,
    )
    return 3
  }
  const previous = tag?.slice(1)
  const range = tag === undefined ? 'HEAD' : `${tag}..HEAD`
  const commits = tag === undefined ? [] : parseLog(repo.log(range))
  if (commits.length === 0 && options.pinned === undefined) {
    output.error(`No app change in ${range}. Nothing to release.`)
    return 2
  }
  const bump = options.bump === 'auto' ? detectBump(commits) : options.bump
  const version = options.pinned ?? applyBump(previous ?? current, bump)
  if (options.notesFile !== undefined) {
    repo.writeFile(options.notesFile, renderNotes(commits, version, previous))
  }
  if (options.write) {
    repo.writeAppJson(withAppVersion(repo.readAppJson(), version))
  }
  output.log(
    JSON.stringify({
      version,
      tag: `v${version}`,
      previous: previous ?? null,
      bump,
      range,
      commits: commits.length,
    }),
  )
  return 0
}

function git(root: string, args: string[]): string {
  const result = spawnSync('git', args, { cwd: root, encoding: 'utf8' })
  if (result.status !== 0) {
    throw new Error(`git ${args.join(' ')} failed: ${result.stderr}`)
  }
  return result.stdout.trim()
}

export function diskRepo(root: string): Repo {
  const appJson = path.join(root, 'app.json')
  return {
    lastTag: () =>
      git(root, ['tag', '--list', 'v[0-9]*', '--sort=-v:refname']).split(
        '\n',
      )[0] || undefined,
    log: range =>
      git(root, [
        'log',
        '--no-merges',
        '--format=%H%x1f%s%x1f%b%x1e',
        range,
        '--',
        ...APP_PATHS,
      ]),
    readAppJson: () => readFileSync(appJson, 'utf8'),
    writeAppJson: text => writeFileSync(appJson, text),
    writeFile: (file, text) => writeFileSync(file, text),
  }
}

// Runs as `node src/lib/release/release-version.ts`, so it imports nothing
// through the `@/` alias that only the bundler and Vitest resolve.
const entry = process.argv[1]
if (entry && path.resolve(entry) === fileURLToPath(import.meta.url)) {
  const root = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    '../../..',
  )
  process.exitCode = runReleaseVersion(
    process.argv.slice(2),
    diskRepo(root),
    console,
  )
}
