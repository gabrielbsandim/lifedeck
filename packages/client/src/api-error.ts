// Thrown by the API client for any non-2xx response. Carries the HTTP status
// and the server error code so callers can branch (e.g. treat 401 as "no
// session"). Shared by the web (cookie) and native (Bearer) transports.
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
