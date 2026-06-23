import { getContainer } from '@/server/container'
import { handleError, ok } from '@/server/api/respond'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const report = await getContainer().checkHealth()
    return ok(report, report.status === 'down' ? 503 : 200)
  } catch (error) {
    return handleError(error)
  }
}
