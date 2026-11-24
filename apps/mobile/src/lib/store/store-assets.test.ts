import { mkdtempSync, readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import os from 'node:os'
import path from 'node:path'
import { SUPPORTED_LOCALES } from '@lifedeck/i18n'
import { describe, expect, it, vi } from 'vitest'
import {
  type Listing,
  type StoreFiles,
  WHATSNEW_LIMIT,
  diskFiles,
  listingProblems,
  runStoreCheck,
  staleProblem,
  storeAssetProblems,
  whatsnewProblem,
} from '@/lib/store/store-assets'

const root = process.cwd()
const shipped = diskFiles(root)

const listing = (over: Partial<Listing> = {}): Listing => ({
  app: 'en',
  play: ['en-US', 'en-GB'],
  apple: ['en-US'],
  name: 'Lifedeck',
  subtitle: 'Your day',
  promoText: 'Plan the day',
  shortDescription: 'Lists and habits',
  keywords: ['tasks', 'habits'],
  description: ['Line one', 'Line two'],
  ...over,
})

const files = (over: Partial<StoreFiles> = {}): StoreFiles => ({
  listings: () => [listing()],
  whatsnew: () => 'Fixes',
  diffExitCode: () => 1,
  writeWhatsnew: vi.fn(),
  ...over,
})

const output = () => ({ log: vi.fn(), error: vi.fn() })

describe('shipped store assets', () => {
  it('have no problem', () => {
    expect(storeAssetProblems(shipped)).toEqual([])
  })

  it('cover every app locale', () => {
    expect(
      shipped
        .listings()
        .map(entry => entry.app)
        .sort(),
    ).toEqual([...SUPPORTED_LOCALES].sort())
  })

  it('feed the App Store metadata from the same listing', () => {
    const config = createRequire(import.meta.url)(
      path.join(root, 'store.config.js'),
    ) as {
      apple: { info: Record<string, { title: string; keywords: string[] }> }
    }
    for (const entry of shipped.listings()) {
      for (const locale of entry.apple) {
        expect(config.apple.info[locale]).toMatchObject({
          title: entry.name,
          keywords: entry.keywords,
        })
      }
    }
  })

  it('compares the notes with git', () => {
    expect(shipped.diffExitCode('pt-BR', 'HEAD')).toBe(0)
    expect(shipped.diffExitCode('pt-BR', 'no-such-ref')).toBeGreaterThan(1)
    expect(shipped.whatsnew('xx-XX')).toBeUndefined()
  })

  it('writes expanded notes to disk', () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), 'whatsnew-'))
    shipped.writeWhatsnew(dir, 'en-GB', 'Fixes')
    expect(readFileSync(path.join(dir, 'whatsnew-en-GB'), 'utf8')).toBe('Fixes')
  })
})

describe('listingProblems', () => {
  it('reports blank and oversized fields', () => {
    expect(
      listingProblems(
        listing({ name: ' ', shortDescription: 'x'.repeat(81), keywords: [] }),
      ),
    ).toEqual([
      'en name is blank',
      'en shortDescription has 81 characters, the store takes 80',
      'en keywords is blank',
    ])
  })

  it('needs a locale in each store', () => {
    expect(listingProblems(listing({ play: [], apple: [] }))).toEqual([
      'en has no play locale',
      'en has no apple locale',
    ])
  })

  it('counts keywords joined by commas', () => {
    const keywords = Array.from({ length: 10 }, () => 'x'.repeat(10))
    expect(listingProblems(listing({ keywords }))).toEqual([
      'en keywords has 109 characters, the store takes 100',
    ])
  })
})

describe('whatsnewProblem', () => {
  it('reports missing, blank and oversized notes', () => {
    expect(whatsnewProblem('en-US', undefined)).toBe(
      'whatsnew-en-US is missing',
    )
    expect(whatsnewProblem('en-US', '\n')).toBe('whatsnew-en-US is blank')
    expect(whatsnewProblem('en-US', 'é'.repeat(WHATSNEW_LIMIT + 1))).toBe(
      'whatsnew-en-US has 501 characters, Play takes 500',
    )
    expect(whatsnewProblem('en-US', 'Fixes')).toBeUndefined()
  })
})

describe('staleProblem', () => {
  it('reads the git diff exit code', () => {
    expect(staleProblem('en-US', 'v1.0.0', 0)).toBe(
      'whatsnew-en-US is unchanged since v1.0.0, write the notes for this release',
    )
    expect(staleProblem('en-US', 'v1.0.0', 1)).toBeUndefined()
    expect(staleProblem('en-US', 'v1.0.0', 128)).toBe(
      'git diff of whatsnew-en-US against v1.0.0 failed',
    )
  })
})

describe('storeAssetProblems', () => {
  it('checks staleness only when given a ref', () => {
    const diffExitCode = vi.fn(() => 0)
    expect(storeAssetProblems(files({ diffExitCode }))).toEqual([])
    expect(diffExitCode).not.toHaveBeenCalled()
    expect(storeAssetProblems(files({ diffExitCode }), 'v1.0.0')).toHaveLength(
      1,
    )
    expect(diffExitCode).toHaveBeenCalledWith('en-US', 'v1.0.0')
  })
})

describe('runStoreCheck', () => {
  it('passes when everything is ready', () => {
    const out = output()
    expect(runStoreCheck(['--since', 'v1.0.0'], files(), out)).toBe(0)
    expect(out.log).toHaveBeenCalledWith(
      'Store listing and notes are ready for 1 locales.',
    )
  })

  it('fails with the problems', () => {
    const out = output()
    expect(runStoreCheck([], files({ whatsnew: () => undefined }), out)).toBe(1)
    expect(out.error).toHaveBeenCalledWith('whatsnew-en-US is missing')
  })

  it('copies the notes to every Play locale', () => {
    const out = output()
    const writeWhatsnew = vi.fn()
    expect(
      runStoreCheck(['--expand', 'out'], files({ writeWhatsnew }), out),
    ).toBe(0)
    expect(writeWhatsnew.mock.calls).toEqual([
      ['out', 'en-US', 'Fixes'],
      ['out', 'en-GB', 'Fixes'],
    ])
    expect(out.log).toHaveBeenCalledWith('Wrote 2 Play release notes to out.')
    expect(runStoreCheck(['--expand'], files(), out)).toBe(1)
    expect(out.error).toHaveBeenCalledWith('--expand needs a directory')
  })

  it('needs a ref after --since', () => {
    const out = output()
    expect(runStoreCheck(['--since'], files(), out)).toBe(1)
    expect(out.error).toHaveBeenCalledWith('--since needs a git tag or ref')
  })
})
