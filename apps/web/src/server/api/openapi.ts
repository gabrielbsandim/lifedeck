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
    '/auth/register': {
      post: {
        summary: 'Upgrade a guest to an email account',
        operationId: 'registerWithEmail',
        description:
          'Sets an email and password on the current guest and emails a verification code.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: { type: 'string', format: 'email' },
                  password: { type: 'string', minLength: 8 },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Account registered; verification code sent.' },
          '401': { description: 'Authentication required.' },
          '422': { description: 'Validation error.' },
        },
      },
    },
    '/auth/verify': {
      post: {
        summary: 'Verify the account email',
        operationId: 'verifyEmail',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['code'],
                properties: { code: { type: 'string', example: '123456' } },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Email verified.' },
          '401': { description: 'Authentication required.' },
          '422': { description: 'Invalid or expired code.' },
        },
      },
    },
    '/auth/resend-code': {
      post: {
        summary: 'Resend the verification code',
        operationId: 'resendVerificationCode',
        responses: {
          '200': { description: 'A new code was sent.' },
          '401': { description: 'Authentication required.' },
          '422': { description: 'Nothing to verify.' },
        },
      },
    },
    '/auth/sign-in': {
      post: {
        summary: 'Sign in with email and password',
        operationId: 'signInWithEmail',
        description: 'Verifies credentials and sets a session cookie.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: { type: 'string', format: 'email' },
                  password: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Signed in.' },
          '422': { description: 'Invalid email or password.' },
        },
      },
    },
    '/auth/google': {
      get: {
        summary: 'Start Google sign-in',
        operationId: 'startGoogleSignIn',
        description: 'Redirects to Google with a CSRF state cookie.',
        responses: {
          '302': { description: 'Redirect to Google consent.' },
        },
      },
    },
    '/auth/google/callback': {
      get: {
        summary: 'Google sign-in callback',
        operationId: 'googleSignInCallback',
        description:
          'Exchanges the code, signs the user in, and redirects home.',
        responses: {
          '302': { description: 'Redirect home with a session cookie.' },
        },
      },
    },
    '/account': {
      patch: {
        summary: 'Rename the current user',
        operationId: 'renameUser',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['displayName'],
                properties: { displayName: { type: 'string', maxLength: 80 } },
              },
            },
          },
        },
        responses: {
          '200': { description: 'User renamed.' },
          '401': { description: 'Authentication required.' },
          '422': { description: 'Validation error.' },
        },
      },
      delete: {
        summary: 'Delete the current account',
        operationId: 'deleteAccount',
        description:
          'Deletes the user and all owned data, then clears the cookie.',
        responses: {
          '200': { description: 'Account deleted.' },
          '401': { description: 'Authentication required.' },
        },
      },
    },
    '/notifications': {
      get: {
        summary: "List the current user's notifications",
        operationId: 'listNotifications',
        description: 'Returns recent notifications and the unread count.',
        responses: {
          '200': { description: 'Notifications and unread count.' },
          '401': { description: 'Authentication required.' },
        },
      },
    },
    '/notifications/read': {
      post: {
        summary: 'Mark all notifications as read',
        operationId: 'markAllNotificationsRead',
        responses: {
          '200': { description: 'All notifications marked read.' },
          '401': { description: 'Authentication required.' },
        },
      },
    },
    '/notifications/{id}/read': {
      post: {
        summary: 'Mark a single notification as read',
        operationId: 'markNotificationRead',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
          },
        ],
        responses: {
          '200': { description: 'Notification marked read.' },
          '401': { description: 'Authentication required.' },
          '404': { description: 'Notification not found.' },
        },
      },
    },
    '/digest': {
      post: {
        summary: "Email the current user today's digest",
        operationId: 'sendDailyDigest',
        description:
          "Sends the daily summary email (in the user's locale) and reports whether an email was sent. Designed to be triggered by a scheduler.",
        responses: {
          '200': { description: 'Digest processed (sent flag in the body).' },
          '401': { description: 'Authentication required.' },
        },
      },
    },
    '/analytics': {
      get: {
        summary: 'Completion analytics',
        operationId: 'getAnalytics',
        description:
          'Daily completion counts, totals, completion rate, and current streak for the current user.',
        parameters: [
          {
            name: 'days',
            in: 'query',
            required: false,
            schema: { type: 'integer', minimum: 1, maximum: 365, default: 30 },
          },
        ],
        responses: {
          '200': { description: 'Analytics for the requested window.' },
          '401': { description: 'Authentication required.' },
        },
      },
    },
    '/account/password': {
      patch: {
        summary: 'Change the account password',
        operationId: 'changePassword',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['currentPassword', 'newPassword'],
                properties: {
                  currentPassword: { type: 'string' },
                  newPassword: { type: 'string', minLength: 8 },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Password changed.' },
          '401': { description: 'Authentication required.' },
          '422': { description: 'Validation error.' },
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
    '/lists/generate': {
      post: {
        summary: 'Generate an editable list draft with AI',
        operationId: 'generateList',
        description:
          'Returns a non-persisted draft (title + tasks) from a guided brief. The user edits and confirms before saving.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['category', 'scale', 'description'],
                properties: {
                  category: {
                    type: 'string',
                    enum: [
                      'wedding',
                      'trip',
                      'moving',
                      'event',
                      'project',
                      'other',
                    ],
                  },
                  title: { type: 'string', maxLength: 120 },
                  targetDate: { type: 'string', format: 'date' },
                  scale: {
                    type: 'string',
                    enum: ['small', 'medium', 'large'],
                  },
                  peopleInvolved: {
                    type: 'array',
                    items: { type: 'string', maxLength: 80 },
                    maxItems: 20,
                  },
                  description: { type: 'string', maxLength: 2000 },
                  locale: { type: 'string', enum: ['en', 'pt'] },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'An editable list draft.' },
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
      patch: {
        summary: 'Rename a list',
        operationId: 'renameList',
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
                required: ['title'],
                properties: { title: { type: 'string', maxLength: 120 } },
              },
            },
          },
        },
        responses: {
          '200': { description: 'List renamed.' },
          '401': { description: 'Authentication required.' },
          '403': { description: 'Not the list owner.' },
          '404': { description: 'List not found.' },
          '422': { description: 'Validation error.' },
        },
      },
      delete: {
        summary: 'Delete a list',
        operationId: 'deleteList',
        description: 'Deletes the list and all its tasks, members, and shares.',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
          },
        ],
        responses: {
          '200': { description: 'List deleted.' },
          '401': { description: 'Authentication required.' },
          '403': { description: 'Not the list owner.' },
          '404': { description: 'List not found.' },
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
      patch: {
        summary: 'Reorder the tasks of a list',
        operationId: 'reorderTasks',
        description: 'Persists the given task order as 0-based positions.',
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
                required: ['taskIds'],
                properties: {
                  taskIds: {
                    type: 'array',
                    items: { type: 'string', format: 'uuid' },
                  },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Tasks reordered.' },
          '401': { description: 'Authentication required.' },
          '403': { description: 'Not allowed to edit this list.' },
          '404': { description: 'List not found or not accessible.' },
        },
      },
    },
    '/lists/{id}/invite': {
      post: {
        summary: 'Invite a collaborator by email',
        operationId: 'inviteToList',
        description:
          'Creates a share link and emails a localized join link to the address (owner only).',
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
                required: ['email'],
                properties: {
                  email: { type: 'string', format: 'email' },
                  role: { type: 'string', enum: ['viewer', 'editor'] },
                  expiresInDays: { type: 'integer', minimum: 1, maximum: 365 },
                },
              },
            },
          },
        },
        responses: {
          '201': { description: 'Invitation sent.' },
          '401': { description: 'Authentication required.' },
          '404': { description: 'List not found.' },
          '422': { description: 'Validation error.' },
        },
      },
    },
    '/lists/{id}/share': {
      get: {
        summary: 'List share links for a list',
        operationId: 'listShareLinks',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
          },
        ],
        responses: {
          '200': { description: 'Share links for the list.' },
          '401': { description: 'Authentication required.' },
          '404': { description: 'List not found.' },
        },
      },
      post: {
        summary: 'Create a share link',
        operationId: 'createShareLink',
        description:
          'Generates a tokenized share link and marks the list shareable by link.',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
          },
        ],
        requestBody: {
          required: false,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  role: { type: 'string', enum: ['editor', 'viewer'] },
                  expiresInDays: { type: 'integer', minimum: 1, maximum: 365 },
                },
              },
            },
          },
        },
        responses: {
          '201': { description: 'Share link created.' },
          '401': { description: 'Authentication required.' },
          '404': { description: 'List not found.' },
        },
      },
    },
    '/lists/{id}/share/{linkId}': {
      delete: {
        summary: 'Revoke a share link',
        operationId: 'revokeShareLink',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
          },
          {
            name: 'linkId',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
          },
        ],
        responses: {
          '200': { description: 'Share link revoked.' },
          '401': { description: 'Authentication required.' },
          '404': { description: 'Share link not found.' },
        },
      },
    },
    '/shared/{token}': {
      get: {
        summary: 'Get a publicly shared board by token',
        operationId: 'getSharedBoard',
        description:
          'Read-only board (list + tasks) for a valid, non-expired share token. No authentication required.',
        parameters: [
          {
            name: 'token',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
        ],
        responses: {
          '200': { description: 'The shared board.' },
          '404': { description: 'Invalid or expired token.' },
        },
      },
    },
    '/shared/{token}/join': {
      post: {
        summary: 'Join a list via its share token',
        operationId: 'joinList',
        description:
          'Adds the current user as a member of the list with the link role.',
        parameters: [
          {
            name: 'token',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
        ],
        responses: {
          '201': { description: 'Joined; membership returned.' },
          '401': { description: 'Authentication required.' },
          '404': { description: 'Invalid or expired token.' },
        },
      },
    },
    '/lists/{id}/members': {
      get: {
        summary: 'List members of a list',
        operationId: 'listMembers',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
          },
        ],
        responses: {
          '200': { description: 'Members of the list.' },
          '401': { description: 'Authentication required.' },
          '404': { description: 'List not found.' },
        },
      },
    },
    '/lists/{id}/members/{userId}': {
      delete: {
        summary: 'Remove a member from a list',
        operationId: 'removeMember',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
          },
          {
            name: 'userId',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
          },
        ],
        responses: {
          '200': { description: 'Member removed.' },
          '401': { description: 'Authentication required.' },
          '404': { description: 'List or member not found.' },
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
