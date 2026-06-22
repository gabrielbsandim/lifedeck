import { z } from 'zod'

export const notificationViewSchema = z.object({
  id: z.string().uuid(),
  type: z.string(),
  data: z.record(z.string()),
  isRead: z.boolean(),
  createdAt: z.string().datetime(),
})

export type NotificationView = z.infer<typeof notificationViewSchema>

export const notificationListViewSchema = z.object({
  items: z.array(notificationViewSchema),
  unread: z.number(),
})

export type NotificationListView = z.infer<typeof notificationListViewSchema>
