export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

type ApiSuccess<T> = { data: T }
type ApiFailure = { error: { code: string; message: string } }

export async function apiRequest<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const { headers, ...rest } = init
  const response = await fetch(path, {
    credentials: 'include',
    headers: { 'content-type': 'application/json', ...headers },
    ...rest,
  })

  const body = (await response.json().catch(() => null)) as
    | ApiSuccess<T>
    | ApiFailure
    | null

  if (!response.ok) {
    const failure = body as ApiFailure | null
    throw new ApiError(
      response.status,
      failure?.error?.code ?? 'UNKNOWN',
      failure?.error?.message ?? 'Request failed.',
    )
  }

  return (body as ApiSuccess<T>).data
}
