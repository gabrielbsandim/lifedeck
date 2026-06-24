import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from 'node:crypto'

const PREFIX = 'enc:v1:'

function key(): Buffer | null {
  const raw = process.env.CALENDAR_TOKEN_KEY?.trim()
  if (!raw) {
    return null
  }
  // Derive a fixed 32-byte key from an arbitrary-length secret.
  return createHash('sha256').update(raw).digest()
}

export function encryptToken(plain: string): string {
  const k = key()
  if (!k) {
    return plain
  }
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', k, iv)
  const ciphertext = Buffer.concat([
    cipher.update(plain, 'utf8'),
    cipher.final(),
  ])
  const tag = cipher.getAuthTag()
  return `${PREFIX}${iv.toString('base64')}:${tag.toString('base64')}:${ciphertext.toString('base64')}`
}

export function decryptToken(value: string): string {
  if (!value.startsWith(PREFIX)) {
    return value
  }
  const k = key()
  if (!k) {
    return value
  }
  const [ivB, tagB, ctB] = value.slice(PREFIX.length).split(':')
  if (!ivB || !tagB || !ctB) {
    return value
  }
  const decipher = createDecipheriv(
    'aes-256-gcm',
    k,
    Buffer.from(ivB, 'base64'),
  )
  decipher.setAuthTag(Buffer.from(tagB, 'base64'))
  const plain = Buffer.concat([
    decipher.update(Buffer.from(ctB, 'base64')),
    decipher.final(),
  ])
  return plain.toString('utf8')
}
