export const VISIBILITIES = ['private', 'link'] as const

export type Visibility = (typeof VISIBILITIES)[number]

export function isVisibility(value: string): value is Visibility {
  return (VISIBILITIES as readonly string[]).includes(value)
}
