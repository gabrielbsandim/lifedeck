export function normalizePhone(value: string): string {
  const trimmed = value.trim()
  const digits = trimmed.replace(/[^\d]/g, '')
  return digits ? `+${digits}` : ''
}

export function isE164(value: string): boolean {
  return /^\+[1-9]\d{6,14}$/.test(value)
}
