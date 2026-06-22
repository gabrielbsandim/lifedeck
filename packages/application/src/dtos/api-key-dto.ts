import { z } from 'zod'
import { API_SCOPES } from '@taskin/domain'

export const createApiKeySchema = z.object({
  name: z.string().trim().min(1).max(80),
  scopes: z
    .array(z.enum(API_SCOPES as unknown as [string, ...string[]]))
    .min(1),
  expiresInDays: z.number().int().min(1).max(365).optional(),
})

export type CreateApiKeyInput = z.infer<typeof createApiKeySchema>

export const apiKeyViewSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  prefix: z.string(),
  scopes: z.array(z.string()),
  lastUsedAt: z.string().datetime().nullable(),
  expiresAt: z.string().datetime().nullable(),
  revokedAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
})

export type ApiKeyView = z.infer<typeof apiKeyViewSchema>

export const createdApiKeyViewSchema = apiKeyViewSchema.extend({
  secret: z.string(),
})

export type CreatedApiKeyView = z.infer<typeof createdApiKeyViewSchema>
