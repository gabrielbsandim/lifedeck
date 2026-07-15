// CPF is the Brazilian taxpayer id Asaas requires to create a customer for a Pix
// or card charge. We validate the check digits so a typo is rejected before it
// reaches the gateway, and we never persist the number (see BillingCustomer,
// which stores only the Asaas customer id).

/** Strip formatting, leaving only the 11 digits. */
export function normalizeCpf(value: string): string {
  return value.replace(/\D/g, '')
}

/** Validate a CPF by its two check digits (rejects repeated-digit sequences). */
export function isValidCpf(value: string): boolean {
  const digits = normalizeCpf(value)
  if (digits.length !== 11) {
    return false
  }
  // "00000000000", "11111111111", ... are numerically valid by the checksum but
  // are never issued, so reject them explicitly.
  if (/^(\d)\1{10}$/.test(digits)) {
    return false
  }
  const nums = digits.split('').map(Number)
  for (const [start, length] of [
    [0, 9],
    [0, 10],
  ] as const) {
    const factorStart = length + 1
    let sum = 0
    for (let i = 0; i < length; i++) {
      sum += nums[start + i]! * (factorStart - i)
    }
    const remainder = (sum * 10) % 11
    const check = remainder === 10 ? 0 : remainder
    if (check !== nums[length]) {
      return false
    }
  }
  return true
}
