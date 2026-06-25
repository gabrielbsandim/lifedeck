import { timingSafeEqual } from 'node:crypto'

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a)
  const right = Buffer.from(b)
  return left.length === right.length && timingSafeEqual(left, right)
}

export function isAuthorizedCron(request: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim()
  if (!secret) {
    return false
  }
  const provided = request.headers.get('authorization') ?? ''
  return safeEqual(provided, `Bearer ${secret}`)
}
