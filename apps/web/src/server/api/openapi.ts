export const API_VERSION = 'v1'

export const openApiDocument = {
  openapi: '3.1.0',
  info: {
    title: 'TaskIn API',
    version: '0.1.0',
    description:
      'White-label REST API for shareable to-do lists. All responses are JSON and wrapped in a top-level "data" or "error" object.',
  },
  servers: [{ url: '/api/v1' }],
  paths: {
    '/health': {
      get: {
        summary: 'Health check',
        operationId: 'getHealth',
        responses: {
          '200': {
            description: 'Service is healthy.',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    data: {
                      type: 'object',
                      properties: {
                        status: { type: 'string', example: 'ok' },
                        version: { type: 'string', example: '0.1.0' },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/tasks': {
      post: {
        summary: 'Create a task',
        operationId: 'createTask',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['listId', 'title'],
                properties: {
                  listId: { type: 'string', format: 'uuid' },
                  title: { type: 'string', maxLength: 280 },
                },
              },
            },
          },
        },
        responses: {
          '201': { description: 'Task created.' },
          '401': { description: 'Authentication required.' },
          '403': { description: 'Not allowed to edit this list.' },
          '404': { description: 'List not found or not accessible.' },
          '422': { description: 'Validation error.' },
        },
      },
    },
    '/tasks/{id}': {
      patch: {
        summary: 'Update a task',
        operationId: 'updateTask',
        description:
          'Edits a task: rename, set an observation, or change status (complete / reopen).',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  title: { type: 'string', maxLength: 280 },
                  observation: {
                    type: 'string',
                    maxLength: 2000,
                    nullable: true,
                  },
                  status: { type: 'string', enum: ['pending', 'completed'] },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Task updated.' },
          '401': { description: 'Authentication required.' },
          '403': { description: 'Not allowed to edit this task.' },
          '404': { description: 'Task not found or not accessible.' },
          '422': { description: 'Validation error.' },
        },
      },
    },
    '/sessions/guest': {
      post: {
        summary: 'Start a guest session',
        operationId: 'createGuestSession',
        description:
          'Creates a guest user from a display name and sets a signed HttpOnly session cookie.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['displayName'],
                properties: {
                  displayName: { type: 'string', maxLength: 80 },
                  locale: { type: 'string', example: 'en' },
                },
              },
            },
          },
        },
        responses: {
          '201': { description: 'Guest session created.' },
          '422': { description: 'Validation error.' },
        },
      },
    },
    '/sessions/me': {
      get: {
        summary: 'Get the current user',
        operationId: 'getCurrentUser',
        responses: {
          '200': { description: 'Current user.' },
          '401': { description: 'No active session.' },
        },
      },
    },
    '/sessions': {
      delete: {
        summary: 'Sign out',
        operationId: 'signOut',
        description: 'Clears the session cookie.',
        responses: {
          '200': { description: 'Signed out.' },
        },
      },
    },
    '/lists': {
      get: {
        summary: "List the current user's lists",
        operationId: 'listLists',
        responses: {
          '200': { description: 'Lists owned by the current user.' },
          '401': { description: 'Authentication required.' },
        },
      },
      post: {
        summary: 'Create a list',
        operationId: 'createList',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['title'],
                properties: {
                  title: { type: 'string', maxLength: 120 },
                  type: { type: 'string', enum: ['daily', 'standalone'] },
                  visibility: { type: 'string', enum: ['private', 'link'] },
                  referenceDate: { type: 'string', format: 'date' },
                },
              },
            },
          },
        },
        responses: {
          '201': { description: 'List created.' },
          '401': { description: 'Authentication required.' },
          '422': { description: 'Validation error.' },
        },
      },
    },
    '/lists/{id}': {
      get: {
        summary: 'Get a list by id',
        operationId: 'getList',
        description:
          'Returns the list if owned by the requester or shared by link; otherwise responds 404.',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
          },
        ],
        responses: {
          '200': { description: 'The requested list.' },
          '404': { description: 'List not found or not accessible.' },
        },
      },
    },
    '/daily': {
      get: {
        summary: "Get the current user's daily board for a date",
        operationId: 'getDailyBoard',
        description:
          'Returns the daily list and its tasks for the given date, provisioning the list and materializing matching recurring tasks on access.',
        parameters: [
          {
            name: 'date',
            in: 'query',
            required: true,
            schema: { type: 'string', format: 'date' },
          },
        ],
        responses: {
          '200': {
            description: 'The daily board (list + tasks) for the date.',
          },
          '401': { description: 'Authentication required.' },
          '422': { description: 'Invalid date.' },
        },
      },
    },
    '/recurring-tasks': {
      get: {
        summary: "List the current user's recurring task definitions",
        operationId: 'listRecurringTasks',
        responses: {
          '200': { description: 'Recurring task definitions.' },
          '401': { description: 'Authentication required.' },
        },
      },
      post: {
        summary: 'Create a recurring task definition',
        operationId: 'createRecurringTask',
        description:
          'Defines a task that materializes into the daily list on each matching date.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['title', 'rule'],
                properties: {
                  title: { type: 'string', maxLength: 280 },
                  rule: { $ref: '#/components/schemas/RecurrenceRule' },
                },
              },
            },
          },
        },
        responses: {
          '201': { description: 'Recurring task created.' },
          '401': { description: 'Authentication required.' },
          '422': { description: 'Validation error.' },
        },
      },
    },
    '/recurring-tasks/{id}': {
      patch: {
        summary: 'Update a recurring task definition',
        operationId: 'updateRecurringTask',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  title: { type: 'string', maxLength: 280 },
                  rule: { $ref: '#/components/schemas/RecurrenceRule' },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Recurring task updated.' },
          '401': { description: 'Authentication required.' },
          '404': { description: 'Recurring task not found.' },
          '422': { description: 'Validation error.' },
        },
      },
      delete: {
        summary: 'Delete a recurring task definition',
        operationId: 'deleteRecurringTask',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
          },
        ],
        responses: {
          '200': { description: 'Recurring task deleted.' },
          '401': { description: 'Authentication required.' },
          '404': { description: 'Recurring task not found.' },
        },
      },
    },
    '/lists/{id}/tasks': {
      get: {
        summary: 'List the tasks of a list',
        operationId: 'listListTasks',
        description:
          'Returns the tasks if the list is owned by the requester or shared by link; otherwise 404.',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
          },
        ],
        responses: {
          '200': { description: 'Tasks of the list.' },
          '404': { description: 'List not found or not accessible.' },
        },
      },
    },
  },
  components: {
    schemas: {
      RecurrenceRule: {
        type: 'object',
        required: ['freq', 'interval', 'startDate'],
        properties: {
          freq: { type: 'string', enum: ['daily', 'weekly', 'monthly'] },
          interval: { type: 'integer', minimum: 1 },
          byWeekday: {
            type: 'array',
            items: { type: 'integer', minimum: 0, maximum: 6 },
            description: '0 = Sunday .. 6 = Saturday (used by weekly).',
          },
          byMonthday: {
            type: 'integer',
            minimum: 1,
            maximum: 31,
            description: 'Day of month (used by monthly).',
          },
          startDate: { type: 'string', format: 'date' },
          until: { type: 'string', format: 'date', nullable: true },
        },
      },
    },
  },
} as const
