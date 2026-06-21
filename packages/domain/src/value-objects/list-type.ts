export const LIST_TYPES = ['daily', 'standalone'] as const

export type ListType = (typeof LIST_TYPES)[number]

export function isListType(value: string): value is ListType {
  return (LIST_TYPES as readonly string[]).includes(value)
}
