import { describe, expect, it } from 'vitest'
import { isValidCpf, normalizeCpf } from '@/value-objects/cpf'

describe('normalizeCpf', () => {
  it('strips formatting to the bare digits', () => {
    expect(normalizeCpf('111.444.777-35')).toBe('11144477735')
    expect(normalizeCpf(' 111 444 777 35 ')).toBe('11144477735')
  })
})

describe('isValidCpf', () => {
  it('accepts a CPF with correct check digits, formatted or not', () => {
    expect(isValidCpf('11144477735')).toBe(true)
    expect(isValidCpf('111.444.777-35')).toBe(true)
    // A second independently valid number.
    expect(isValidCpf('529.982.247-25')).toBe(true)
  })

  it('rejects wrong check digits', () => {
    expect(isValidCpf('11144477700')).toBe(false)
    expect(isValidCpf('111.444.777-34')).toBe(false)
    // First digit right, second wrong.
    expect(isValidCpf('11144477730')).toBe(false)
  })

  it('rejects repeated-digit sequences that pass the checksum trivially', () => {
    expect(isValidCpf('00000000000')).toBe(false)
    expect(isValidCpf('11111111111')).toBe(false)
    expect(isValidCpf('99999999999')).toBe(false)
  })

  it('rejects the wrong number of digits', () => {
    expect(isValidCpf('1114447773')).toBe(false)
    expect(isValidCpf('111444777350')).toBe(false)
    expect(isValidCpf('')).toBe(false)
  })
})
