export const CARRY_OVER_MODES = ['manual', 'auto'] as const

export type CarryOverMode = (typeof CARRY_OVER_MODES)[number]

export function isCarryOverMode(value: string): value is CarryOverMode {
  return (CARRY_OVER_MODES as readonly string[]).includes(value)
}
