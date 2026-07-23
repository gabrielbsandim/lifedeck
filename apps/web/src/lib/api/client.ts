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
type ApiPageSuccess<T> = { data: T[]; nextCursor: string | null }
type ApiFailure = { error: { code: string; message: string } }

export type ApiPage<T> = { items: T[]; nextCursor: string | null }

function browserLanguage(): string | undefined {
  if (typeof navigator !== 'undefined' && navigator.language) {
    return navigator.language
  }
  return undefined
}

async function apiFetch(
  path: string,
  init: RequestInit,
): Promise<ApiSuccess<unknown> | ApiPageSuccess<unknown>> {
  const { headers, ...rest } = init
  const language = browserLanguage()
  // FormData sets its own multipart content-type (with the boundary); forcing
  // application/json here would corrupt the upload, so let the browser own it.
  const isForm =
    typeof FormData !== 'undefined' && init.body instanceof FormData
  const response = await fetch(path, {
    credentials: 'include',
    headers: {
      ...(isForm ? {} : { 'content-type': 'application/json' }),
      ...(language ? { 'accept-language': language } : {}),
      ...headers,
    },
    ...rest,
  })

  const body = (await response.json().catch(() => null)) as
    | ApiSuccess<unknown>
    | ApiPageSuccess<unknown>
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

  return body as ApiSuccess<unknown> | ApiPageSuccess<unknown>
}

export async function apiRequest<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const body = await apiFetch(path, init)
  return (body as ApiSuccess<T>).data
}

export async function apiRequestPage<T>(
  path: string,
  init: RequestInit = {},
): Promise<ApiPage<T>> {
  const body = (await apiFetch(path, init)) as ApiPageSuccess<T>
  return { items: body.data, nextCursor: body.nextCursor }
}
