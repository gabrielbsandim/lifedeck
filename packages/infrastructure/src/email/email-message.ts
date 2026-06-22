export type EmailTemplate =
  | { type: 'verification-code'; data: { code: string; appName: string } }
  | { type: 'list-invitation'; data: { listTitle: string; url: string } }
  | {
      type: 'task-assignment'
      data: { taskTitle: string; listTitle: string }
    }
  | {
      type: 'daily-digest'
      data: {
        date: string
        total: number
        completed: number
        pendingTitles: string[]
      }
    }

export type RenderedEmail = {
  subject: string
  html: string
}
