import { z } from 'zod'

// Fail fast at server boot when a production deploy is missing a variable the
// app cannot work without. Without this, a missing DATABASE_URL/AUTH_SECRET
// deploys "green" and then every request 500s at runtime with a confusing
// error; a missing CRON_SECRET silently disables every scheduled job; a missing
// NEXT_PUBLIC_SITE_URL points share/email/OAuth links at the ephemeral
// deployment host. One loud error at boot beats a dozen silent failures later.
const productionEnvSchema = z.object({
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  AUTH_SECRET: z.string().min(32, 'AUTH_SECRET must be at least 32 characters'),
  NEXT_PUBLIC_SITE_URL: z
    .string()
    .url('NEXT_PUBLIC_SITE_URL must be an absolute URL'),
  CRON_SECRET: z.string().min(1, 'CRON_SECRET is required'),
})

export function assertProductionEnv(
  source: NodeJS.ProcessEnv = process.env,
): void {
  if (source.NODE_ENV !== 'production') {
    return
  }
  const result = productionEnvSchema.safeParse(source)
  if (result.success) {
    return
  }
  const issues = result.error.issues
    .map(issue => `- ${issue.path.join('.')}: ${issue.message}`)
    .join('\n')
  throw new Error(
    `Invalid production environment. Fix these before deploying:\n${issues}`,
  )
}
