import { ok } from '@/server/api/respond'

export const dynamic = 'force-dynamic'

export function GET() {
  return ok({ status: 'ok', version: '0.1.0' })
}
