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
  },
} as const
