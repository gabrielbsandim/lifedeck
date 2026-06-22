// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { openApiDocument } from '@/server/api/openapi'

type Doc = {
  openapi: string
  paths: Record<string, Record<string, unknown>>
  components: {
    schemas: Record<string, unknown>
    securitySchemes: Record<string, unknown>
  }
}

const doc = openApiDocument as unknown as Doc

describe('openApiDocument', () => {
  it('is a valid 3.1 document with the core paths', () => {
    expect(doc.openapi).toBe('3.1.0')
    expect(doc.paths['/health']).toBeDefined()
    expect(doc.paths['/tasks']).toHaveProperty('post')
    expect(doc.paths['/api-keys']).toHaveProperty('post')
    expect(doc.paths['/api-keys/{id}']).toHaveProperty('delete')
  })

  it('derives component schemas from the Zod DTOs', () => {
    expect(doc.components.schemas.TaskView).toBeDefined()
    expect(doc.components.schemas.ListView).toBeDefined()
    expect(doc.components.schemas.CreatedApiKeyView).toBeDefined()
  })

  it('declares the API key security scheme', () => {
    expect(doc.components.securitySchemes.ApiKeyAuth).toMatchObject({
      type: 'http',
      scheme: 'bearer',
    })
  })

  it('secures resource endpoints with the API key scheme', () => {
    const tasks = doc.paths['/tasks'] as Record<
      string,
      { security?: unknown[] }
    >
    expect(tasks.post?.security).toBeDefined()
  })
})
