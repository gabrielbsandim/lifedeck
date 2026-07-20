// A hard backstop against a bug fanning out proactive messages: it caps how many
// assistant-initiated sends a single user can receive on one civil day. The
// sweeps are already once-per-day per user, so under normal operation this never
// trips; it exists so a misfire can't blast someone. Durable + shared across
// serverless instances (Redis in production).
export interface ProactiveSendGuard {
  // Atomically records a proactive send for the user on the given civil date and
  // returns whether it stayed within the daily cap. Over the cap returns false,
  // and the caller skips the send.
  tryConsume(userId: string, civilDate: string): Promise<boolean>
}
