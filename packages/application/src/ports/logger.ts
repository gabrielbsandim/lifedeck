// A minimal structured logger the application layer can call without depending
// on a concrete logging library. Infrastructure supplies the implementation.
export interface Logger {
  error(message: string, meta?: Record<string, unknown>): void
  warn(message: string, meta?: Record<string, unknown>): void
  info(message: string, meta?: Record<string, unknown>): void
}
