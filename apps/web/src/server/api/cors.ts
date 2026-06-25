const ALLOWED_METHODS = 'GET, POST, PATCH, DELETE, OPTIONS'
const ALLOWED_HEADERS = 'Authorization, Content-Type, X-API-Key'

// The public API is meant to be consumed cross-origin by third-party apps that
// authenticate with an API key (sent in a header, not a cookie). We therefore
// allow any origin but deliberately omit Access-Control-Allow-Credentials, so
// browsers never attach the first-party session cookie to a cross-origin call.
export function corsHeaders(): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': ALLOWED_METHODS,
    'Access-Control-Allow-Headers': ALLOWED_HEADERS,
    'Access-Control-Max-Age': '86400',
  }
}

export function isPublicApiPath(pathname: string): boolean {
  return pathname.startsWith('/api/v1/')
}
