// Hermes ships `atob`, but it yields a binary string; the raw-body upload
// endpoints want bytes. Kept in its own module so it is unit-testable without
// pulling React Query in.
export function base64ToBytes(base64: string): Uint8Array {
  const binary = globalThis.atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index)
  }
  return bytes
}
