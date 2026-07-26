import { describe, expect, it } from 'vitest'
import {
  findBestTitleMatch,
  isSameTitle,
  normalizeTitle,
  titleMatchScore,
  titleTokens,
} from '@/shared/activity-match'

describe('normalizeTitle', () => {
  it('strips case, accents and punctuation', () => {
    expect(normalizeTitle('  Passear com a Rhaenyra! ')).toBe(
      'passear com a rhaenyra',
    )
    expect(normalizeTitle('Ir ao Mercado')).toBe('ir ao mercado')
  })
})

describe('titleTokens', () => {
  it('drops filler words and very short ones', () => {
    expect(titleTokens('Ir ao mercado com a Ana')).toEqual(['mercado', 'ana'])
  })
})

describe('titleMatchScore', () => {
  it('matches a conjugated verb against the stored infinitive', () => {
    // The real failure: "eu treinei ontem" never reached the habit "Treinar".
    expect(titleMatchScore('treinei', 'Treinar')).toBeGreaterThan(0)
    expect(
      titleMatchScore('passeamos com a Rhaenyra', 'Passear com Rhaenyra'),
    ).toBeGreaterThan(1)
  })

  it('matches on a shared distinctive word', () => {
    expect(titleMatchScore('fomos ao mercado', 'Ir ao mercado')).toBe(1)
  })

  it('scores an exact title above every partial match', () => {
    expect(titleMatchScore('Ir ao mercado', 'ir ao MERCADO')).toBeGreaterThan(
      titleMatchScore('Ir ao mercado', 'Ir ao mercado municipal com a Ana'),
    )
  })

  it('does not relate unrelated titles', () => {
    expect(titleMatchScore('Pagar o aluguel', 'Passear com Rhaenyra')).toBe(0)
    expect(titleMatchScore('treinei', 'Ler um livro')).toBe(0)
  })

  it('ignores filler-only overlap', () => {
    expect(titleMatchScore('fui para casa', 'ir para o trabalho')).toBe(0)
  })
})

describe('findBestTitleMatch', () => {
  const habits = [
    { id: 'h1', title: 'Ler' },
    { id: 'h2', title: 'Treinar' },
  ]

  it('picks the related candidate', () => {
    expect(findBestTitleMatch(habits, 'treinei ontem', h => h.title)).toEqual(
      habits[1],
    )
  })

  it('returns null when nothing is related', () => {
    expect(findBestTitleMatch(habits, 'levar o lixo', h => h.title)).toBeNull()
  })

  it('keeps the first candidate on a tie', () => {
    const tasks = [
      { id: 't1', title: 'Passear com Rhaenyra' },
      { id: 't2', title: 'Passear com Rhaenyra' },
    ]
    expect(
      findBestTitleMatch(tasks, 'Passear com Rhaenyra', t => t.title),
    ).toBe(tasks[0])
  })
})

describe('isSameTitle', () => {
  it('ignores case, accents and punctuation', () => {
    expect(isSameTitle('Ir ao mercado', 'ir ao MERCADO!')).toBe(true)
    expect(isSameTitle('Ir ao mercado', 'Ir ao mercado municipal')).toBe(false)
  })
})
