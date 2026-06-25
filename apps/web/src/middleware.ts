import { NextResponse, type NextRequest } from 'next/server'
import { corsHeaders, isPublicApiPath } from '@/server/api/cors'

export function middleware(request: NextRequest): NextResponse {
  if (!isPublicApiPath(request.nextUrl.pathname)) {
    return NextResponse.next()
  }
  if (request.method === 'OPTIONS') {
    return new NextResponse(null, { status: 204, headers: corsHeaders() })
  }
  const response = NextResponse.next()
  for (const [key, value] of Object.entries(corsHeaders())) {
    response.headers.set(key, value)
  }
  return response
}

export const config = {
  matcher: '/api/v1/:path*',
}
