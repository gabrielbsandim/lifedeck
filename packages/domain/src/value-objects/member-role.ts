export const MEMBER_ROLES = ['owner', 'editor', 'viewer'] as const

export type MemberRole = (typeof MEMBER_ROLES)[number]

export function isMemberRole(value: string): value is MemberRole {
  return (MEMBER_ROLES as readonly string[]).includes(value)
}
