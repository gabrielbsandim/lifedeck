import { NextResponse } from 'next/server'
import { getContainer } from '@/server/container'
import { handleError, ok } from '@/server/api/respond'
import { requireScope } from '@/server/api/authenticate'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireScope(request, 'lists:write')
    if (auth instanceof NextResponse) {
      return auth
    }
    const { id } = await params
    const body = await request.json().catch(() => ({}))
    const link = await getContainer().createShareLink(auth.userId, id, body)
    return ok(link, 201)
  } catch (error) {
    return handleError(error)
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireScope(request, 'lists:read')
    if (auth instanceof NextResponse) {
      return auth
    }
    const { id } = await params
    const links = await getContainer().listShareLinks(auth.userId, id)
    return ok(links)
  } catch (error) {
    return handleError(error)
  }
}
