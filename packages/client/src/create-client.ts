import { ApiError } from './api-error'

export type ApiPage<T> = { items: T[]; nextCursor: string | null }

export type ApiClientConfig = {
  // Prepended to every request path. '' on the web (paths are already absolute
  // API routes); the full '<host>/api/v1' base on native clients.
  baseUrl?: string
  // Cookie mode for the browser. Native clients omit this and authenticate with
  // a Bearer token instead (see getToken).
  credentials?: RequestCredentials
  // Returns the Accept-Language value, or undefined to omit the header.
  getLocale?: () => string | undefined
  // Returns a session token sent as `Authorization: Bearer`, or null to omit it.
  getToken?: () =>
    | string
    | null
    | undefined
    | Promise<string | null | undefined>
  // The fetch implementation. Defaults to the global fetch.
  fetch?: typeof fetch
}

export type ApiClient = {
  request: <T>(path: string, init?: RequestInit) => Promise<T>
  requestPage: <T>(path: string, init?: RequestInit) => Promise<ApiPage<T>>
}

type ApiSuccess<T> = { data: T }
type ApiPageSuccess<T> = { data: T[]; nextCursor: string | null }
type ApiFailure = { error: { code: string; message: string } }

// Builds an API client bound to a transport. The web injects cookie mode + the
// browser language; native injects a base URL, the device locale, and a token
// getter. The request/response envelope is identical across both.
export function createApiClient(config: ApiClientConfig = {}): ApiClient {
  const baseUrl = config.baseUrl ?? ''

  async function apiFetch(
    path: string,
    init: RequestInit,
  ): Promise<ApiSuccess<unknown> | ApiPageSuccess<unknown>> {
    const { headers, ...rest } = init
    const language = config.getLocale?.()
    const token = config.getToken ? await config.getToken() : null
    const url = `${baseUrl}${path}`
    const requestInit: RequestInit = {
      ...(config.credentials ? { credentials: config.credentials } : {}),
      headers: {
        'content-type': 'application/json',
        ...(language ? { 'accept-language': language } : {}),
        ...(token ? { authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
      ...rest,
    }

    // Resolve fetch lazily: an injected fetch wins, otherwise call the global
    // as a method of globalThis (late binding keeps test stubs working and
    // avoids "Illegal invocation" from a detached browser fetch).
    const response = config.fetch
      ? await config.fetch(url, requestInit)
      : await globalThis.fetch(url, requestInit)

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

  return {
    async request<T>(path: string, init: RequestInit = {}): Promise<T> {
      const body = await apiFetch(path, init)
      return (body as ApiSuccess<T>).data
    },
    async requestPage<T>(
      path: string,
      init: RequestInit = {},
    ): Promise<ApiPage<T>> {
      const body = (await apiFetch(path, init)) as ApiPageSuccess<T>
      return { items: body.data, nextCursor: body.nextCursor }
    },
  }
}
