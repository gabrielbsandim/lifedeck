import { mkdtempSync, readFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import {
  type Commit,
  type Repo,
  applyBump,
  detectBump,
  diskRepo,
  parseCommit,
  parseLog,
  parseOptions,
  readAppVersion,
  renderNotes,
  runReleaseVersion,
  withAppVersion,
} from '@/lib/release/release-version'

const root = process.cwd()
const appJson = readFileSync(path.join(root, 'app.json'), 'utf8')

const record = (hash: string, subject: string, body = '') =>
  `${hash}\x1f${subject}\x1f${body}\x1e`

const commit = (over: Partial<Commit> = {}): Commit => ({
  hash: 'abcdef1234',
  subject: 'fix: a',
  description: 'a',
  type: 'fix',
  breaking: false,
  ...over,
})

const repo = (over: Partial<Repo> = {}): Repo => ({
  lastTag: () => 'v1.2.3',
  log: () => record('1111111aaa', 'feat(lists): share by link'),
  readAppJson: () => appJson,
  writeAppJson: vi.fn(),
  writeFile: vi.fn(),
  ...over,
})

const output = () => ({ log: vi.fn(), error: vi.fn() })

describe('parseCommit', () => {
  it('reads type, scope and breaking marks', () => {
    expect(parseCommit('abc\x1ffeat(ui)!: new deck\x1f')).toMatchObject({
      type: 'feat',
      scope: 'ui',
      description: 'new deck',
      breaking: true,
    })
    expect(parseCommit('abc\x1ffix: x\x1fBREAKING CHANGE: gone').breaking).toBe(
      true,
    )
    expect(parseCommit('abc\x1fWip stuff')).toEqual({
      hash: 'abc',
      subject: 'Wip stuff',
      description: 'Wip stuff',
      breaking: false,
    })
    expect(parseCommit('')).toMatchObject({ hash: '', subject: '' })
  })
})

describe('parseLog', () => {
  it('drops the release bookkeeping commits', () => {
    const raw = [
      record('1', 'build: release v1.3.0'),
      `\n${record('2', 'release: v1.3.0 (#41)')}`,
      `\n${record('3', 'fix: keep me')}`,
      '\n',
    ].join('')
    expect(parseLog(raw).map(entry => entry.hash)).toEqual(['3'])
  })
})

describe('detectBump and applyBump', () => {
  it('reads the strongest change', () => {
    expect(detectBump([commit()])).toBe('patch')
    expect(detectBump([commit(), commit({ type: 'feat' })])).toBe('minor')
    expect(detectBump([commit({ breaking: true })])).toBe('major')
  })

  it('moves one digit and keeps 0.x off a major', () => {
    expect(applyBump('1.2.3', 'patch')).toBe('1.2.4')
    expect(applyBump('1.2.3', 'minor')).toBe('1.3.0')
    expect(applyBump('1.2.3', 'major')).toBe('2.0.0')
    expect(applyBump('0.4.1', 'major')).toBe('0.5.0')
  })
})

describe('renderNotes', () => {
  it('groups by type with breaking changes first', () => {
    const notes = renderNotes(
      [
        commit({ type: 'feat', scope: 'lists', description: 'share' }),
        commit({ description: 'crash', breaking: true }),
        commit({ type: 'wip', description: 'odd' }),
        commit({ type: undefined, description: 'loose' }),
      ],
      '1.3.0',
      '1.2.3',
    )
    expect(notes).toBe(
      [
        '## v1.3.0',
        '',
        '### Breaking Changes',
        '',
        '- crash (abcdef1)',
        '',
        '### Features',
        '',
        '- **lists:** share (abcdef1)',
        '',
        '### Uncategorised',
        '',
        '- odd (abcdef1)',
        '- loose (abcdef1)',
        '',
        '**Full diff:** `v1.2.3`...`v1.3.0`',
        '',
      ].join('\n'),
    )
  })

  it('marks the first release', () => {
    expect(renderNotes([], '1.0.0', undefined)).toBe(
      '## v1.0.0\n\nFirst store release.\n',
    )
  })
})

describe('app.json version', () => {
  it('reads and rewrites only expo.version', () => {
    const current = readAppVersion(appJson)
    const next = withAppVersion(appJson, '9.8.7')
    expect(readAppVersion(next)).toBe('9.8.7')
    expect(next.replace('9.8.7', current)).toBe(appJson)
  })

  it('refuses a file without a usable version', () => {
    expect(() => readAppVersion('{"expo":{"version":"1.0"}}')).toThrow('X.Y.Z')
    expect(() => readAppVersion('{}')).toThrow('X.Y.Z')
    expect(() =>
      withAppVersion(
        '{"plugins":[{"version":"1.0.0"}],"expo":{"version":"2.0.0"}}',
        '3.0.0',
      ),
    ).toThrow('not expo.version')
  })
})

describe('parseOptions', () => {
  it('validates the flags', () => {
    expect(parseOptions([])).toEqual({
      bump: 'auto',
      pinned: undefined,
      notesFile: undefined,
      write: false,
    })
    expect(parseOptions(['--bump', 'huge'])).toMatch('Unknown --bump')
    expect(parseOptions(['--version', 'v1'])).toMatch('not a bare')
    expect(parseOptions(['--notes-file'])).toBe('--notes-file needs a path.')
  })
})

describe('runReleaseVersion', () => {
  it('prints the next version, writes the notes and bumps app.json', () => {
    const out = output()
    const disk = repo()
    expect(
      runReleaseVersion(['--notes-file', 'notes.md', '--write'], disk, out),
    ).toBe(0)
    expect(JSON.parse(out.log.mock.calls[0]![0] as string)).toEqual({
      version: '1.3.0',
      tag: 'v1.3.0',
      previous: '1.2.3',
      bump: 'minor',
      range: 'v1.2.3..HEAD',
      commits: 1,
    })
    expect(disk.writeFile).toHaveBeenCalledWith(
      'notes.md',
      expect.stringContaining('**lists:** share by link'),
    )
    expect(disk.writeAppJson).toHaveBeenCalledWith(
      withAppVersion(appJson, '1.3.0'),
    )
  })

  it('honours a requested bump', () => {
    const out = output()
    expect(runReleaseVersion(['--bump', 'patch'], repo(), out)).toBe(0)
    expect(out.log).toHaveBeenCalledWith(expect.stringContaining('"1.2.4"'))
  })

  it('stops when nothing in the app changed', () => {
    const out = output()
    expect(runReleaseVersion([], repo({ log: () => '' }), out)).toBe(2)
    expect(out.error).toHaveBeenCalledWith(
      'No app change in v1.2.3..HEAD. Nothing to release.',
    )
  })

  it('needs a pinned version before the first tag', () => {
    const out = output()
    const untagged = repo({ lastTag: () => undefined })
    expect(runReleaseVersion([], untagged, out)).toBe(3)
    expect(runReleaseVersion(['--version', '1.0.0'], untagged, out)).toBe(0)
    expect(out.log).toHaveBeenCalledWith(
      expect.stringContaining('"previous":null'),
    )
  })

  it('prints the usage and rejects bad flags', () => {
    const out = output()
    expect(runReleaseVersion(['--help'], repo(), out)).toBe(0)
    expect(out.log).toHaveBeenCalledWith(expect.stringContaining('--bump'))
    expect(runReleaseVersion(['--bump', 'x'], repo(), out)).toBe(1)
  })
})

describe('diskRepo', () => {
  it('reads tags, history and app.json from git', () => {
    const disk = diskRepo(root)
    expect(disk.lastTag() ?? 'v0.0.0').toMatch(/^v\d/)
    // HEAD..HEAD stays valid in the shallow checkout the OTA workflow makes.
    expect(parseLog(disk.log('HEAD..HEAD'))).toEqual([])
    expect(readAppVersion(disk.readAppJson())).toMatch(/^\d+\.\d+\.\d+$/)
    expect(() => disk.log('no-such-ref..HEAD')).toThrow('git log')
  })
  it('writes app.json and the notes file', () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), 'release-'))
    const disk = diskRepo(dir)
    disk.writeAppJson(appJson)
    disk.writeFile(path.join(dir, 'notes.md'), 'notes')
    expect(disk.readAppJson()).toBe(appJson)
    expect(readFileSync(path.join(dir, 'notes.md'), 'utf8')).toBe('notes')
  })
})
