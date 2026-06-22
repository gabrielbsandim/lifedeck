export const API_SCOPES = [
  'lists:read',
  'lists:write',
  'tasks:read',
  'tasks:write',
  'analytics:read',
] as const

export type ApiScope = (typeof API_SCOPES)[number]

export function isApiScope(value: string): value is ApiScope {
  return (API_SCOPES as readonly string[]).includes(value)
}
