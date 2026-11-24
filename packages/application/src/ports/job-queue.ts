export type EnqueueJobInput = {
  type: string
  payload: Record<string, unknown>
  runAt: Date
  // A second enqueue with the same key is dropped, so a fan-out that runs twice
  // in one hour still produces one job.
  dedupKey?: string
}

export interface JobQueue {
  enqueue(input: EnqueueJobInput): Promise<void>
}
