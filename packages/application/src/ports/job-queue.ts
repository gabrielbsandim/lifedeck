export type EnqueueJobInput = {
  type: string
  payload: Record<string, unknown>
  runAt: Date
}

export interface JobQueue {
  enqueue(input: EnqueueJobInput): Promise<void>
}
