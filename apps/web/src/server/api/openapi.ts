import {
  OpenAPIRegistry,
  OpenApiGeneratorV31,
  extendZodWithOpenApi,
} from '@asteasolutions/zod-to-openapi'
import { z } from 'zod'
import {
  analyticsViewSchema,
  apiKeyViewSchema,
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
  shareLinkViewSchema,
  taskViewSchema,
  updateCalendarEventSchema,
  updateRecurringTaskSchema,
  updateTaskSchema,
} from '@lifedeck/application'
import { SITE_NAME } from '@/lib/site'

extendZodWithOpenApi(z)

export const API_VERSION = 'v1'

const registry = new OpenAPIRegistry()

const ApiKeyAuth = registry.registerComponent('securitySchemes', 'ApiKeyAuth', {
  type: 'http',
  scheme: 'bearer',
  description:
    'Send a personal API key as `Authorization: Bearer tk_live_...` (or the `X-API-Key` header). Keys are scoped and rate limited per key. Each endpoint lists the scope it requires in its `security` entry; a request whose key lacks that scope is rejected with `403`. Available scopes: `lists:read`, `lists:write`, `tasks:read`, `tasks:write`, `analytics:read`, `calendar:read`, `calendar:write`.',
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

registry.register('RecurrenceRule', recurrenceRuleSchema)
const TaskView = registry.register('TaskView', taskViewSchema)
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
  responses: {
    200: jsonResponse('Lists owned by the current user.', z.array(ListView)),
    401: errorResponse,
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
  method: 'post',
  path: '/lists/{id}/invite',
  summary: 'Invite a collaborator by email',
  operationId: 'inviteToList',
  security: apiKeySecurity,
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
  security: apiKeySecurity,
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
  security: apiKeySecurity,
  responses: {
    200: jsonResponse(
      'Recurring task definitions.',
      z.array(RecurringTaskView),
    ),
    401: errorResponse,
  },
})

registry.registerPath({
  method: 'post',
  path: '/recurring-tasks',
  summary: 'Create a recurring task definition',
  operationId: 'createRecurringTask',
  security: apiKeySecurity,
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
  security: apiKeySecurity,
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
  security: apiKeySecurity,
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
