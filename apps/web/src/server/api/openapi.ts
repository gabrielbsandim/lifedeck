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
  },
} as const
