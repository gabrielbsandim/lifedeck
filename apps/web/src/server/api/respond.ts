import { NextResponse } from 'next/server'
import * as Sentry from '@sentry/nextjs'
import { ZodError } from 'zod'
import { ValidationError } from '@lifedeck/domain'
import {
  ForbiddenError,
  NotFoundError,
  QuotaExceededError,
} from '@lifedeck/application'
import { log } from '@/server/api/logger'

export type ApiErrorBody = {
  error: {
    code: string
    message: string
    details?: unknown
  }
}

export function ok<T>(data: T, status = 200): NextResponse {
  return NextResponse.json({ data }, { status })
}

export function fail(
  code: string,
  message: string,
  status: number,
  details?: unknown,
  init?: { headers?: HeadersInit },
): NextResponse<ApiErrorBody> {
  return NextResponse.json(
    { error: { code, message, details } },
    { status, headers: init?.headers },
  )
}

export function handleError(error: unknown): NextResponse<ApiErrorBody> {
  if (error instanceof ZodError) {
    return fail('VALIDATION_ERROR', 'Invalid request payload.', 422, {
      issues: error.issues,
    })
  }
  if (error instanceof ValidationError) {
    return fail('VALIDATION_ERROR', error.message, 422)
  }
  if (error instanceof NotFoundError) {
    return fail('NOT_FOUND', error.message, 404)
  }
  if (error instanceof ForbiddenError) {
    return fail('FORBIDDEN', error.message, 403)
  }
  if (error instanceof QuotaExceededError) {
    return fail('QUOTA_EXCEEDED', error.message, 429, {
      window: error.window,
      limit: error.limit,
      used: error.used,
    })
  }
  Sentry.captureException(error)
  log('error', 'Unhandled API error', {
    error: error instanceof Error ? error.message : String(error),
  })
  return fail('INTERNAL_ERROR', 'Something went wrong.', 500)
}
