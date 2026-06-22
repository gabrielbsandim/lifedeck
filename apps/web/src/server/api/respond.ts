import { NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { ValidationError } from '@taskin/domain'
import { ForbiddenError, NotFoundError } from '@taskin/application'

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
): NextResponse<ApiErrorBody> {
  return NextResponse.json({ error: { code, message, details } }, { status })
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
  return fail('INTERNAL_ERROR', 'Something went wrong.', 500)
}
