import { getContainer } from '@/server/container'
import { handleError, ok } from '@/server/api/respond'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const task = await getContainer().createTask(body)
    return ok(task, 201)
  } catch (error) {
    return handleError(error)
  }
}
