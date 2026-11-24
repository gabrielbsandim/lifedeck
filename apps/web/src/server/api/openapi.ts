import {
  OpenAPIRegistry,
  OpenApiGeneratorV31,
  extendZodWithOpenApi,
} from '@asteasolutions/zod-to-openapi'
import { z } from 'zod'
import {
  analyticsViewSchema,
  apiKeyViewSchema,
  calendarConnectionViewSchema,
  calendarEventViewSchema,
  createApiKeySchema,
  createCalendarEventSchema,
  createdApiKeyViewSchema,
  createListSchema,
  createRecurringTaskSchema,
  createShareLinkSchema,
  createTaskSchema,
  generatedListViewSchema,
  generationBriefSchema,
  inviteToListSchema,
  listViewSchema,
  memberViewSchema,
  notificationListViewSchema,
  recurrenceRuleSchema,
  recurringTaskViewSchema,
  renameListSchema,
  reorderTasksSchema,
  reorderSubtasksSchema,
  shareLinkViewSchema,
  taskViewSchema,
  subtaskViewSchema,
  createSubtaskSchema,
  updateSubtaskSchema,
  updateCalendarEventSchema,
  updateRecurringTaskSchema,
  updateTaskSchema,
  availabilityOverrideInputSchema,
  bookableSlotViewSchema,
  bookingClientInputSchema,
  bookingClientViewSchema,
  bookingReasonSchema,
  bookingRequestResultSchema,
  bookingServiceInputSchema,
  bookingServiceViewSchema,
  bookingSetupViewSchema,
  bookingPageViewSchema,
  bookingViewSchema,
  createBookingForClientSchema,
  listBookableSlotsQuerySchema,
  listBookingsQuerySchema,
  managedBookingViewSchema,
  markBookingOutcomeSchema,
  publicBookingPageViewSchema,
  reorderBookingServicesSchema,
  requestBookingSchema,
  rescheduleBookingSchema,
  rescheduleByTokenSchema,
  setAvailabilitySchema,
  slugAvailabilityViewSchema,
  upsertBookingPageSchema,
} from '@lifedeck/application'
import { SITE_NAME } from '@/lib/site'

extendZodWithOpenApi(z)

export const API_VERSION = 'v1'

const registry = new OpenAPIRegistry()

const ApiKeyAuth = registry.registerComponent('securitySchemes', 'ApiKeyAuth', {
  type: 'http',
  scheme: 'bearer',
  description:
    'Send a personal API key as `Authorization: Bearer tk_live_...` (or the `X-API-Key` header). Keys are scoped and rate limited per key. Each endpoint lists the scope it requires in its `security` entry; a request whose key lacks that scope is rejected with `403`. Available scopes: `lists:read`, `lists:write`, `tasks:read`, `tasks:write`, `analytics:read`, `calendar:read`, `calendar:write`, `booking:read`, `booking:write`.',
})

const apiKeySecurity = [{ [ApiKeyAuth.name]: [] }]

function scoped(scope: string) {
  return [{ [ApiKeyAuth.name]: [scope] }]
}

function envelope<T extends z.ZodTypeAny>(schema: T) {
  return z.object({ data: schema })
}

function jsonBody<T extends z.ZodTypeAny>(schema: T) {
  return {
    content: { 'application/json': { schema } },
  }
}

function jsonResponse<T extends z.ZodTypeAny>(description: string, schema: T) {
  return {
    description,
    content: { 'application/json': { schema: envelope(schema) } },
  }
}

function pageEnvelope<T extends z.ZodTypeAny>(schema: T) {
  return z.object({
    data: z.array(schema),
    nextCursor: z.string().nullable(),
  })
}

function pageResponse<T extends z.ZodTypeAny>(description: string, schema: T) {
  return {
    description,
    content: { 'application/json': { schema: pageEnvelope(schema) } },
  }
}

const limitParam = z
  .string()
  .optional()
  .openapi({
    param: {
      name: 'limit',
      in: 'query',
      description: 'Maximum items to return (1-100, default 50).',
    },
    example: '50',
  })

const cursorParam = z
  .string()
  .optional()
  .openapi({
    param: {
      name: 'cursor',
      in: 'query',
      description: "Opaque cursor from a previous response's nextCursor.",
    },
  })

registry.register('RecurrenceRule', recurrenceRuleSchema)
const TaskView = registry.register('TaskView', taskViewSchema)
const SubtaskView = registry.register('SubtaskView', subtaskViewSchema)
const ListView = registry.register('ListView', listViewSchema)
const MemberView = registry.register('MemberView', memberViewSchema)
const ShareLinkView = registry.register('ShareLinkView', shareLinkViewSchema)
const RecurringTaskView = registry.register(
  'RecurringTaskView',
  recurringTaskViewSchema,
)
const AnalyticsView = registry.register('AnalyticsView', analyticsViewSchema)
const GeneratedListView = registry.register(
  'GeneratedListView',
  generatedListViewSchema,
)
const ApiKeyView = registry.register('ApiKeyView', apiKeyViewSchema)
const CreatedApiKeyView = registry.register(
  'CreatedApiKeyView',
  createdApiKeyViewSchema,
)
const CalendarEventView = registry.register(
  'CalendarEventView',
  calendarEventViewSchema,
)
const CalendarConnectionView = registry.register(
  'CalendarConnectionView',
  calendarConnectionViewSchema,
)
const NotificationListView = registry.register(
  'NotificationListView',
  notificationListViewSchema,
)

const errorResponse = {
  description: 'Error.',
  content: {
    'application/json': {
      schema: z.object({
        error: z.object({
          code: z.string(),
          message: z.string(),
          details: z.unknown().optional(),
        }),
      }),
    },
  },
}

const idParam = registry.registerParameter(
  'IdParam',
  z
    .string()
    .uuid()
    .openapi({ param: { name: 'id', in: 'path' } }),
)

registry.registerPath({
  method: 'get',
  path: '/health',
  summary: 'Health check',
  operationId: 'getHealth',
  responses: {
    200: jsonResponse(
      'Service is healthy.',
      z.object({ status: z.string(), version: z.string() }),
    ),
  },
})

registry.registerPath({
  method: 'post',
  path: '/api-keys',
  summary: 'Create an API key',
  operationId: 'createApiKey',
  description:
    'Issues a personal API key. The raw secret is returned once and cannot be retrieved again. Requires a session (keys cannot mint keys).',
  request: { body: jsonBody(createApiKeySchema) },
  responses: {
    201: jsonResponse(
      'The created key, including its one-time secret.',
      CreatedApiKeyView,
    ),
    401: errorResponse,
    422: errorResponse,
  },
})

registry.registerPath({
  method: 'get',
  path: '/api-keys',
  summary: 'List API keys',
  operationId: 'listApiKeys',
  responses: {
    200: jsonResponse(
      'The session user keys (without secrets).',
      z.array(ApiKeyView),
    ),
    401: errorResponse,
  },
})

registry.registerPath({
  method: 'delete',
  path: '/api-keys/{id}',
  summary: 'Revoke an API key',
  operationId: 'revokeApiKey',
  request: { params: z.object({ id: idParam }) },
  responses: {
    200: jsonResponse('Key revoked.', z.object({ revoked: z.boolean() })),
    401: errorResponse,
    404: errorResponse,
  },
})

registry.registerPath({
  method: 'post',
  path: '/tasks',
  summary: 'Create a task',
  operationId: 'createTask',
  security: scoped('tasks:write'),
  request: { body: jsonBody(createTaskSchema) },
  responses: {
    201: jsonResponse('Task created.', TaskView),
    401: errorResponse,
    403: errorResponse,
    404: errorResponse,
    422: errorResponse,
  },
})

registry.registerPath({
  method: 'patch',
  path: '/tasks/{id}',
  summary: 'Update a task',
  operationId: 'updateTask',
  security: scoped('tasks:write'),
  request: {
    params: z.object({ id: idParam }),
    body: jsonBody(updateTaskSchema),
  },
  responses: {
    200: jsonResponse('Task updated.', TaskView),
    401: errorResponse,
    403: errorResponse,
    404: errorResponse,
    422: errorResponse,
  },
})

registry.registerPath({
  method: 'get',
  path: '/lists',
  summary: "List the current user's lists",
  operationId: 'listLists',
  security: scoped('lists:read'),
  request: {
    query: z.object({
      limit: limitParam,
      cursor: cursorParam,
      type: z
        .enum(['daily', 'standalone'])
        .optional()
        .openapi({
          param: {
            name: 'type',
            in: 'query',
            description: 'Filter lists by type.',
          },
        }),
    }),
  },
  responses: {
    200: pageResponse(
      'A page of lists accessible to the current user, newest first.',
      ListView,
    ),
    401: errorResponse,
    422: errorResponse,
  },
})

registry.registerPath({
  method: 'post',
  path: '/lists',
  summary: 'Create a list',
  operationId: 'createList',
  security: scoped('lists:write'),
  request: { body: jsonBody(createListSchema) },
  responses: {
    201: jsonResponse('List created.', ListView),
    401: errorResponse,
    422: errorResponse,
  },
})

registry.registerPath({
  method: 'get',
  path: '/lists/{id}',
  summary: 'Get a list by id',
  operationId: 'getList',
  security: scoped('lists:read'),
  request: { params: z.object({ id: idParam }) },
  responses: {
    200: jsonResponse('The requested list.', ListView),
    404: errorResponse,
  },
})

registry.registerPath({
  method: 'patch',
  path: '/lists/{id}',
  summary: 'Rename a list',
  operationId: 'renameList',
  security: scoped('lists:write'),
  request: {
    params: z.object({ id: idParam }),
    body: jsonBody(renameListSchema),
  },
  responses: {
    200: jsonResponse('List renamed.', ListView),
    401: errorResponse,
    403: errorResponse,
    404: errorResponse,
    422: errorResponse,
  },
})

registry.registerPath({
  method: 'delete',
  path: '/lists/{id}',
  summary: 'Delete a list',
  operationId: 'deleteList',
  security: scoped('lists:write'),
  request: { params: z.object({ id: idParam }) },
  responses: {
    200: jsonResponse('List deleted.', z.object({ deleted: z.boolean() })),
    401: errorResponse,
    403: errorResponse,
    404: errorResponse,
  },
})

registry.registerPath({
  method: 'get',
  path: '/lists/{id}/tasks',
  summary: 'List the tasks of a list',
  operationId: 'listListTasks',
  security: scoped('tasks:read'),
  request: { params: z.object({ id: idParam }) },
  responses: {
    200: jsonResponse('Tasks of the list.', z.array(TaskView)),
    404: errorResponse,
  },
})

registry.registerPath({
  method: 'patch',
  path: '/lists/{id}/tasks',
  summary: 'Reorder the tasks of a list',
  operationId: 'reorderTasks',
  security: scoped('tasks:write'),
  request: {
    params: z.object({ id: idParam }),
    body: jsonBody(reorderTasksSchema),
  },
  responses: {
    200: jsonResponse('Tasks reordered.', z.array(TaskView)),
    401: errorResponse,
    403: errorResponse,
    404: errorResponse,
  },
})

registry.registerPath({
  method: 'get',
  path: '/tasks/{id}/subtasks',
  summary: 'List the subtasks of a task',
  operationId: 'listSubtasks',
  security: scoped('tasks:read'),
  request: { params: z.object({ id: idParam }) },
  responses: {
    200: jsonResponse('Subtasks of the task.', z.array(SubtaskView)),
    401: errorResponse,
    404: errorResponse,
  },
})

registry.registerPath({
  method: 'post',
  path: '/tasks/{id}/subtasks',
  summary: 'Create a subtask',
  operationId: 'createSubtask',
  security: scoped('tasks:write'),
  request: {
    params: z.object({ id: idParam }),
    body: jsonBody(createSubtaskSchema),
  },
  responses: {
    201: jsonResponse('Subtask created.', SubtaskView),
    401: errorResponse,
    403: errorResponse,
    404: errorResponse,
    422: errorResponse,
  },
})

registry.registerPath({
  method: 'patch',
  path: '/tasks/{id}/subtasks',
  summary: 'Reorder the subtasks of a task',
  operationId: 'reorderSubtasks',
  security: scoped('tasks:write'),
  request: {
    params: z.object({ id: idParam }),
    body: jsonBody(reorderSubtasksSchema),
  },
  responses: {
    200: jsonResponse('Subtasks reordered.', z.array(SubtaskView)),
    401: errorResponse,
    403: errorResponse,
    404: errorResponse,
  },
})

registry.registerPath({
  method: 'patch',
  path: '/subtasks/{id}',
  summary: 'Update a subtask',
  operationId: 'updateSubtask',
  security: scoped('tasks:write'),
  request: {
    params: z.object({ id: idParam }),
    body: jsonBody(updateSubtaskSchema),
  },
  responses: {
    200: jsonResponse('Subtask updated.', SubtaskView),
    401: errorResponse,
    403: errorResponse,
    404: errorResponse,
    422: errorResponse,
  },
})

registry.registerPath({
  method: 'delete',
  path: '/subtasks/{id}',
  summary: 'Delete a subtask',
  operationId: 'deleteSubtask',
  security: scoped('tasks:write'),
  request: { params: z.object({ id: idParam }) },
  responses: {
    200: jsonResponse('Subtask deleted.', z.object({ deleted: z.boolean() })),
    401: errorResponse,
    403: errorResponse,
    404: errorResponse,
  },
})

registry.registerPath({
  method: 'post',
  path: '/lists/{id}/invite',
  summary: 'Invite a collaborator by email',
  operationId: 'inviteToList',
  security: scoped('lists:write'),
  request: {
    params: z.object({ id: idParam }),
    body: jsonBody(inviteToListSchema),
  },
  responses: {
    201: jsonResponse('Invitation sent.', ShareLinkView),
    401: errorResponse,
    404: errorResponse,
    422: errorResponse,
  },
})

registry.registerPath({
  method: 'post',
  path: '/lists/{id}/share',
  summary: 'Create a share link',
  operationId: 'createShareLink',
  security: scoped('lists:write'),
  request: {
    params: z.object({ id: idParam }),
    body: jsonBody(createShareLinkSchema),
  },
  responses: {
    201: jsonResponse('Share link created.', ShareLinkView),
    401: errorResponse,
    404: errorResponse,
  },
})

registry.registerPath({
  method: 'post',
  path: '/lists/generate',
  summary: 'Generate an editable list draft with AI',
  operationId: 'generateList',
  security: apiKeySecurity,
  description:
    'Returns a non-persisted draft (title + tasks) from a guided brief. The user edits and confirms before saving.',
  request: { body: jsonBody(generationBriefSchema) },
  responses: {
    200: jsonResponse('An editable list draft.', GeneratedListView),
    401: errorResponse,
    422: errorResponse,
  },
})

registry.registerPath({
  method: 'get',
  path: '/daily',
  summary: "Get the current user's daily board for a date",
  operationId: 'getDailyBoard',
  security: scoped('tasks:read'),
  request: {
    query: z.object({
      date: z.string().openapi({ example: '2026-06-22' }),
    }),
  },
  responses: {
    200: jsonResponse(
      'The daily board (list + tasks + carry-over candidates) for the date.',
      z.object({
        list: ListView,
        tasks: z.array(TaskView),
        carryOver: z.array(z.object({ task: TaskView, fromDate: z.string() })),
      }),
    ),
    401: errorResponse,
    422: errorResponse,
  },
})

registry.registerPath({
  method: 'post',
  path: '/tasks/{id}/carry-forward',
  summary: "Bring a prior day's unfinished task into today",
  operationId: 'bringTaskToToday',
  description:
    "Creates a copy of the task in today's daily list and marks the original as carried forward (it stays as a record).",
  request: { params: z.object({ id: idParam }) },
  responses: {
    201: jsonResponse('The created copy in today.', TaskView),
    401: errorResponse,
    403: errorResponse,
    404: errorResponse,
  },
})

registry.registerPath({
  method: 'get',
  path: '/recurring-tasks',
  summary: "List the current user's recurring task definitions",
  operationId: 'listRecurringTasks',
  security: scoped('tasks:read'),
  request: {
    query: z.object({ limit: limitParam, cursor: cursorParam }),
  },
  responses: {
    200: pageResponse(
      'A page of recurring task definitions, newest first.',
      RecurringTaskView,
    ),
    401: errorResponse,
    422: errorResponse,
  },
})

registry.registerPath({
  method: 'post',
  path: '/recurring-tasks',
  summary: 'Create a recurring task definition',
  operationId: 'createRecurringTask',
  security: scoped('tasks:write'),
  request: { body: jsonBody(createRecurringTaskSchema) },
  responses: {
    201: jsonResponse('Recurring task created.', RecurringTaskView),
    401: errorResponse,
    422: errorResponse,
  },
})

registry.registerPath({
  method: 'patch',
  path: '/recurring-tasks/{id}',
  summary: 'Update a recurring task definition',
  operationId: 'updateRecurringTask',
  security: scoped('tasks:write'),
  request: {
    params: z.object({ id: idParam }),
    body: jsonBody(updateRecurringTaskSchema),
  },
  responses: {
    200: jsonResponse('Recurring task updated.', RecurringTaskView),
    401: errorResponse,
    404: errorResponse,
    422: errorResponse,
  },
})

registry.registerPath({
  method: 'delete',
  path: '/recurring-tasks/{id}',
  summary: 'Delete a recurring task definition',
  operationId: 'deleteRecurringTask',
  security: scoped('tasks:write'),
  request: { params: z.object({ id: idParam }) },
  responses: {
    200: jsonResponse(
      'Recurring task deleted.',
      z.object({ deleted: z.boolean() }),
    ),
    401: errorResponse,
    404: errorResponse,
  },
})

registry.registerPath({
  method: 'get',
  path: '/analytics',
  summary: 'Completion analytics',
  operationId: 'getAnalytics',
  security: scoped('analytics:read'),
  request: {
    query: z.object({
      days: z.coerce.number().int().min(1).max(365).optional(),
    }),
  },
  responses: {
    200: jsonResponse('Analytics for the requested window.', AnalyticsView),
    401: errorResponse,
  },
})

registry.registerPath({
  method: 'get',
  path: '/notifications',
  summary: "List the current user's notifications",
  operationId: 'listNotifications',
  responses: {
    200: jsonResponse('Notifications and unread count.', NotificationListView),
    401: errorResponse,
  },
})

registry.registerPath({
  method: 'get',
  path: '/lists/{id}/members',
  summary: 'List members of a list',
  operationId: 'listMembers',
  request: { params: z.object({ id: idParam }) },
  responses: {
    200: jsonResponse('Members of the list.', z.array(MemberView)),
    401: errorResponse,
    404: errorResponse,
  },
})

registry.registerPath({
  method: 'get',
  path: '/shared/{token}',
  summary: 'Get a publicly shared board by token',
  operationId: 'getSharedBoard',
  description:
    'Read-only board (list + tasks) for a valid, non-expired share token. No authentication required.',
  request: {
    params: z.object({
      token: z.string().openapi({ param: { name: 'token', in: 'path' } }),
    }),
  },
  responses: {
    200: jsonResponse(
      'The shared board.',
      z.object({ list: ListView, tasks: z.array(TaskView) }),
    ),
    404: errorResponse,
  },
})

registry.registerPath({
  method: 'get',
  path: '/calendar/events',
  summary: 'List calendar events overlapping a time range',
  operationId: 'listCalendarEvents',
  security: scoped('calendar:read'),
  request: {
    query: z.object({
      from: z.string().openapi({ example: '2026-06-01T00:00:00.000Z' }),
      to: z.string().openapi({ example: '2026-06-30T23:59:59.000Z' }),
    }),
  },
  responses: {
    200: jsonResponse('Events in the range.', z.array(CalendarEventView)),
    401: errorResponse,
    403: errorResponse,
    404: errorResponse,
    422: errorResponse,
  },
})

registry.registerPath({
  method: 'post',
  path: '/calendar/events',
  summary: 'Create a calendar event',
  operationId: 'createCalendarEvent',
  security: scoped('calendar:write'),
  request: { body: jsonBody(createCalendarEventSchema) },
  responses: {
    201: jsonResponse('The created event.', CalendarEventView),
    401: errorResponse,
    403: errorResponse,
    404: errorResponse,
    422: errorResponse,
  },
})

registry.registerPath({
  method: 'get',
  path: '/calendar/events/{id}',
  summary: 'Get a calendar event',
  operationId: 'getCalendarEvent',
  security: scoped('calendar:read'),
  request: { params: z.object({ id: idParam }) },
  responses: {
    200: jsonResponse('The event.', CalendarEventView),
    401: errorResponse,
    403: errorResponse,
    404: errorResponse,
  },
})

registry.registerPath({
  method: 'patch',
  path: '/calendar/events/{id}',
  summary: 'Update a calendar event',
  operationId: 'updateCalendarEvent',
  security: scoped('calendar:write'),
  request: {
    params: z.object({ id: idParam }),
    body: jsonBody(updateCalendarEventSchema),
  },
  responses: {
    200: jsonResponse('The updated event.', CalendarEventView),
    401: errorResponse,
    403: errorResponse,
    404: errorResponse,
    422: errorResponse,
  },
})

registry.registerPath({
  method: 'delete',
  path: '/calendar/events/{id}',
  summary: 'Delete a calendar event',
  operationId: 'deleteCalendarEvent',
  security: scoped('calendar:write'),
  request: { params: z.object({ id: idParam }) },
  responses: {
    200: jsonResponse(
      'Deletion acknowledged.',
      z.object({ deleted: z.boolean() }),
    ),
    401: errorResponse,
    403: errorResponse,
    404: errorResponse,
  },
})

registry.registerPath({
  method: 'get',
  path: '/calendar/connections',
  summary: 'List connected calendars',
  description:
    'Returns the Google calendar accounts the user has connected. A user can connect more than one (for example personal and work); one is flagged as the default target for events created in Lifedeck.',
  operationId: 'listCalendarConnections',
  security: scoped('calendar:read'),
  responses: {
    200: jsonResponse('Connected calendars.', z.array(CalendarConnectionView)),
    401: errorResponse,
    403: errorResponse,
  },
})

registry.registerPath({
  method: 'delete',
  path: '/calendar/connections/{id}',
  summary: 'Disconnect a calendar',
  description:
    'Removes a calendar connection and the events synced from it. If the default connection is removed, another connection is promoted to default.',
  operationId: 'disconnectCalendar',
  security: scoped('calendar:write'),
  request: { params: z.object({ id: idParam }) },
  responses: {
    200: jsonResponse(
      'Disconnection acknowledged.',
      z.object({ disconnected: z.boolean() }),
    ),
    401: errorResponse,
    403: errorResponse,
    404: errorResponse,
  },
})

registry.registerPath({
  method: 'post',
  path: '/calendar/connections/{id}/default',
  summary: 'Set the default calendar',
  description:
    'Marks a connection as the default; events created in Lifedeck sync to it.',
  operationId: 'setDefaultCalendar',
  security: scoped('calendar:write'),
  request: { params: z.object({ id: idParam }) },
  responses: {
    200: jsonResponse('Default updated.', z.object({ isDefault: z.boolean() })),
    401: errorResponse,
    403: errorResponse,
    404: errorResponse,
  },
})

// Booking: the host side takes a session or an API key with booking scopes; the
// public side takes neither and is rate limited per IP (and per email on a request).
const BookingView = registry.register('BookingView', bookingViewSchema)
const BookingClientView = registry.register(
  'BookingClientView',
  bookingClientViewSchema,
)
const BookingServiceView = registry.register(
  'BookingServiceView',
  bookingServiceViewSchema,
)
const BookingSetupView = registry.register(
  'BookingSetupView',
  bookingSetupViewSchema,
)
const ManagedBookingView = registry.register(
  'ManagedBookingView',
  managedBookingViewSchema,
)
const bookingErrors = {
  401: errorResponse,
  403: errorResponse,
  404: errorResponse,
  422: errorResponse,
}
const publicErrors = {
  404: errorResponse,
  422: errorResponse,
  429: errorResponse,
}
const slugParams = z.object({ slug: z.string().openapi({ example: 'ana' }) })
const tokenParams = z.object({ token: z.string() })
const done = jsonResponse('Done.', z.unknown())

type BookingPath = {
  method: 'get' | 'post' | 'put' | 'patch' | 'delete'
  path: string
  summary: string
  operationId: string
  scope?: 'booking:read' | 'booking:write'
  request?: Parameters<typeof registry.registerPath>[0]['request']
  ok: ReturnType<typeof jsonResponse>
  status?: 200 | 201
}

const BOOKING_PATHS: BookingPath[] = [
  {
    method: 'get',
    path: '/booking/setup',
    summary: 'Read the booking page, services and hours',
    operationId: 'getBookingSetup',
    scope: 'booking:read',
    ok: jsonResponse('The setup.', BookingSetupView),
  },
  {
    method: 'get',
    path: '/booking/slug-check',
    summary: 'Check whether a page link is free',
    operationId: 'checkBookingSlug',
    scope: 'booking:read',
    request: { query: z.object({ slug: z.string() }) },
    ok: jsonResponse('Availability.', slugAvailabilityViewSchema),
  },
  {
    method: 'put',
    path: '/booking/page',
    summary: 'Create or update the booking page',
    operationId: 'upsertBookingPage',
    scope: 'booking:write',
    request: { body: jsonBody(upsertBookingPageSchema) },
    ok: jsonResponse('The page.', bookingPageViewSchema),
  },
  {
    method: 'post',
    path: '/booking/services',
    summary: 'Add a service',
    operationId: 'createBookingService',
    scope: 'booking:write',
    request: { body: jsonBody(bookingServiceInputSchema) },
    ok: jsonResponse('Service created.', BookingServiceView),
    status: 201,
  },
  {
    method: 'patch',
    path: '/booking/services/{id}',
    summary: 'Update a service',
    operationId: 'updateBookingService',
    scope: 'booking:write',
    request: {
      params: z.object({ id: idParam }),
      body: jsonBody(bookingServiceInputSchema.partial()),
    },
    ok: jsonResponse('Service updated.', BookingServiceView),
  },
  {
    method: 'delete',
    path: '/booking/services/{id}',
    summary: 'Archive a service',
    operationId: 'archiveBookingService',
    scope: 'booking:write',
    request: { params: z.object({ id: idParam }) },
    ok: jsonResponse('Service archived.', BookingServiceView),
  },
  {
    method: 'post',
    path: '/booking/services/reorder',
    summary: 'Reorder services',
    operationId: 'reorderBookingServices',
    scope: 'booking:write',
    request: { body: jsonBody(reorderBookingServicesSchema) },
    ok: jsonResponse('New order.', z.array(BookingServiceView)),
  },
  {
    method: 'put',
    path: '/booking/availability',
    summary: 'Replace the weekly hours',
    operationId: 'setAvailability',
    scope: 'booking:write',
    request: { body: jsonBody(setAvailabilitySchema) },
    ok: done,
  },
  {
    method: 'put',
    path: '/booking/availability/overrides',
    summary: 'Set the hours of one date',
    operationId: 'setAvailabilityOverride',
    scope: 'booking:write',
    request: { body: jsonBody(availabilityOverrideInputSchema) },
    ok: done,
  },
  {
    method: 'delete',
    path: '/booking/availability/overrides/{date}',
    summary: 'Remove the exception for a date',
    operationId: 'deleteAvailabilityOverride',
    scope: 'booking:write',
    request: { params: z.object({ date: z.string() }) },
    ok: done,
  },
  {
    method: 'get',
    path: '/booking/clients',
    summary: 'List clients',
    operationId: 'listBookingClients',
    scope: 'booking:read',
    request: { query: z.object({ search: z.string().optional() }) },
    ok: jsonResponse('Clients.', z.array(BookingClientView)),
  },
  {
    method: 'post',
    path: '/booking/clients',
    summary: 'Add a client, reusing one with the same email or phone',
    operationId: 'createBookingClient',
    scope: 'booking:write',
    request: { body: jsonBody(bookingClientInputSchema) },
    ok: jsonResponse('The client.', BookingClientView),
    status: 201,
  },
  {
    method: 'patch',
    path: '/booking/clients/{id}',
    summary: 'Update a client',
    operationId: 'updateBookingClient',
    scope: 'booking:write',
    request: {
      params: z.object({ id: idParam }),
      body: jsonBody(bookingClientInputSchema),
    },
    ok: jsonResponse('The client.', BookingClientView),
  },
  {
    method: 'get',
    path: '/booking/bookings',
    summary: 'List bookings in a range',
    operationId: 'listBookings',
    scope: 'booking:read',
    request: {
      query: listBookingsQuerySchema.extend({
        status: z
          .string()
          .optional()
          .openapi({ description: 'Comma-separated statuses.' }),
      }),
    },
    ok: jsonResponse('Bookings.', z.array(BookingView)),
  },
  {
    method: 'post',
    path: '/booking/bookings',
    summary: 'Book for a client',
    operationId: 'createBookingForClient',
    scope: 'booking:write',
    request: { body: jsonBody(createBookingForClientSchema) },
    ok: jsonResponse('Booking created.', BookingView),
    status: 201,
  },
  ...(
    [
      ['confirm', 'Approve a pending booking', z.object({})],
      ['decline', 'Decline a pending booking', bookingReasonSchema],
      ['cancel', 'Cancel a booking', bookingReasonSchema],
      ['reschedule', 'Move a booking', rescheduleBookingSchema],
      ['outcome', 'Record how a past booking went', markBookingOutcomeSchema],
    ] as const
  ).map(
    ([action, summary, body]): BookingPath => ({
      method: 'post',
      path: `/booking/bookings/{id}/${action}`,
      summary,
      operationId: `${action}Booking`,
      scope: 'booking:write',
      request: { params: z.object({ id: idParam }), body: jsonBody(body) },
      ok: done,
    }),
  ),
  {
    method: 'get',
    path: '/public/booking/{slug}',
    summary: 'Read a public booking page',
    operationId: 'getPublicBookingPage',
    request: { params: slugParams },
    ok: jsonResponse('The page.', publicBookingPageViewSchema),
  },
  {
    method: 'get',
    path: '/public/booking/{slug}/slots',
    summary: 'List free slots of a service (31 days at most)',
    operationId: 'listBookableSlots',
    request: { params: slugParams, query: listBookableSlotsQuerySchema },
    ok: jsonResponse('Slots.', z.array(bookableSlotViewSchema)),
  },
  {
    method: 'post',
    path: '/public/booking/{slug}/requests',
    summary: 'Book a slot',
    operationId: 'requestBooking',
    request: { params: slugParams, body: jsonBody(requestBookingSchema) },
    ok: jsonResponse('Booked.', bookingRequestResultSchema),
    status: 201,
  },
  {
    method: 'get',
    path: '/public/booking/manage/{token}',
    summary: 'Read a booking from its manage link',
    operationId: 'getManagedBooking',
    request: { params: tokenParams },
    ok: jsonResponse('The booking.', ManagedBookingView),
  },
  {
    method: 'post',
    path: '/public/booking/manage/{token}/cancel',
    summary: 'Cancel from the manage link',
    operationId: 'cancelBookingByToken',
    request: { params: tokenParams, body: jsonBody(bookingReasonSchema) },
    ok: jsonResponse('The booking.', ManagedBookingView),
  },
  {
    method: 'post',
    path: '/public/booking/manage/{token}/reschedule',
    summary: 'Move from the manage link',
    operationId: 'rescheduleBookingByToken',
    request: { params: tokenParams, body: jsonBody(rescheduleByTokenSchema) },
    ok: jsonResponse('The booking.', ManagedBookingView),
  },
]

for (const entry of BOOKING_PATHS) {
  registry.registerPath({
    method: entry.method,
    path: entry.path,
    summary: entry.summary,
    operationId: entry.operationId,
    tags: ['Booking'],
    ...(entry.scope ? { security: scoped(entry.scope) } : { security: [] }),
    request: entry.request,
    responses: {
      [entry.status ?? 200]: entry.ok,
      ...(entry.scope ? bookingErrors : publicErrors),
      409: errorResponse,
    },
  })
}

const generated = new OpenApiGeneratorV31(
  registry.definitions,
).generateDocument({
  openapi: '3.1.0',
  info: {
    title: `${SITE_NAME} API`,
    version: '0.2.0',
    description:
      'White-label REST API for shareable to-do lists. Responses are JSON, wrapped in a top-level `data` or `error` object. Resource endpoints accept a personal API key (`Authorization: Bearer tk_live_...` or `X-API-Key`) scoped per key and rate limited per key. Components are generated from the same Zod schemas the server validates against.',
  },
  servers: [{ url: '/api/v1' }],
})

export const openApiDocument = generated as unknown as Record<string, unknown>
