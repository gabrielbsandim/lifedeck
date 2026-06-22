export interface PasswordHasher {
  hash(plain: string): Promise<string>
  verify(plain: string, hash: string): Promise<boolean>
  needsRehash(hash: string): boolean
}
