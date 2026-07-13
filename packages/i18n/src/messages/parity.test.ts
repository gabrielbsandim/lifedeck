import { describe, expect, it } from 'vitest'
import { en } from '@/messages/en'
import { pt } from '@/messages/pt'
import { es } from '@/messages/es'

// The `: Messages` annotation on each catalog already guarantees the typed keys
// exist at compile time. These runtime checks add what the type system cannot:
// that no translated leaf was left as an empty string, and that the structural
// shape (object keys) matches across every locale. Array indices are normalized
// so a legitimately different number of items in translated legal prose does not
// register as a structural difference.
type Json = unknown

function structurePaths(value: Json, prefix = ''): Set<string> {
  const paths = new Set<string>()
  const walk = (node: Json, path: string) => {
    if (Array.isArray(node)) {
      node.forEach(item => walk(item, `${path}[]`))
      return
    }
    if (node && typeof node === 'object') {
      for (const [key, child] of Object.entries(node)) {
        walk(child, path ? `${path}.${key}` : key)
      }
      return
    }
    paths.add(path)
  }
  walk(value, prefix)
  return paths
}

function emptyLeaves(value: Json, prefix = ''): string[] {
  if (Array.isArray(value)) {
    return value.flatMap((item, i) => emptyLeaves(item, `${prefix}[${i}]`))
  }
  if (value && typeof value === 'object') {
    return Object.entries(value).flatMap(([key, child]) =>
      emptyLeaves(child, prefix ? `${prefix}.${key}` : key),
    )
  }
  return typeof value === 'string' && value.trim() === '' ? [prefix] : []
}

describe('message catalog parity', () => {
  const enPaths = [...structurePaths(en)].sort()

  it('pt has the same structural key paths as en', () => {
    expect([...structurePaths(pt)].sort()).toEqual(enPaths)
  })

  it('es has the same structural key paths as en', () => {
    expect([...structurePaths(es)].sort()).toEqual(enPaths)
  })

  it.each([
    ['en', en],
    ['pt', pt],
    ['es', es],
  ])('%s has no empty string leaves', (_name, catalog) => {
    expect(emptyLeaves(catalog)).toEqual([])
  })
})
