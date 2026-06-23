# API reference

Lifedeck exposes a versioned, white-label REST API under `/api/v1`. It is designed
to be consumed independently of the Lifedeck web UI.

- **Base URL:** `https://<your-host>/api/v1`
- **Format:** JSON only.
- **Envelope:** success responses are wrapped in `{ "data": ... }`; errors in
  `{ "error": { "code", "message", "details? } }`.
- **OpenAPI document:** `GET /api/v1/openapi`
- **Interactive reference:** `GET /docs` (rendered with Scalar).

## Conventions

| Concern        | Rule                                                              |
| -------------- | ----------------------------------------------------------------- |
| Identifiers    | UUID v4 strings.                                                  |
| Timestamps     | ISO 8601 UTC strings.                                             |
| Validation     | Request bodies are validated with Zod; failures return `422`.     |
| Errors         | Stable machine-readable `code` plus a human-readable `message`.   |
| Versioning     | The version is in the path (`/api/v1`). Breaking changes bump it. |

## Authentication

The API accepts two credential types:

| Caller          | Credential                                   | How                                                       |
| --------------- | -------------------------------------------- | --------------------------------------------------------- |
| The Lifedeck web UI | Signed `HttpOnly` session cookie             | Set automatically on sign-in; carries full access.        |
| Third parties   | Personal **API key**                         | `Authorization: Bearer tk_live_...` or `X-API-Key: tk_live_...`. |

API keys are created from the **Developers** screen (`/developers`). The raw
secret (`tk_live_...`) is shown **once** at creation and never again - only a
SHA-256 hash is stored. Manage keys (create, list, revoke) under
`/api/v1/api-keys*`; those management endpoints require a session, so a key
cannot mint another key.

### Scopes

Each key is restricted to an explicit set of scopes. A request to a resource
endpoint that the key is not scoped for returns `403 FORBIDDEN`.

| Scope            | Grants                                              |
| ---------------- | --------------------------------------------------- |
| `tasks:read`     | Read tasks, daily boards, list tasks.               |
| `tasks:write`    | Create, update, reorder tasks.                      |
| `lists:read`     | Read lists.                                          |
| `lists:write`    | Create, rename, delete lists; invite; share.        |
| `analytics:read` | Read completion analytics.                          |

The session cookie is implicitly granted every scope.

### Rate limiting

API-key requests are rate limited **per key** (sliding window, 60 requests per
60 seconds by default). Responses carry `X-RateLimit-Limit`,
`X-RateLimit-Remaining`, and `X-RateLimit-Reset`; exceeding the window returns
`429 RATE_LIMITED`. Rate limiting is backed by Upstash Redis and is a no-op when
`UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` are unset (local dev).

### Quickstart

```bash
# Create a list with a scoped key
curl -X POST https://<your-host>/api/v1/lists \
  -H "Authorization: Bearer tk_live_xxx" \
  -H "Content-Type: application/json" \
  -d '{ "title": "Launch", "type": "standalone" }'

# Add a task to it
curl -X POST https://<your-host>/api/v1/tasks \
  -H "X-API-Key: tk_live_xxx" \
  -H "Content-Type: application/json" \
  -d '{ "listId": "<list-id>", "title": "Draft announcement" }'
```

## Single source of truth

The OpenAPI document at `GET /api/v1/openapi` is **generated from the same Zod
schemas the server validates against** (via `@asteasolutions/zod-to-openapi`),
so request/response shapes in `/docs` cannot drift from runtime behavior.

## Error codes

| HTTP | `code`             | Meaning                              |
| ---- | ------------------ | ------------------------------------ |
| 422  | `VALIDATION_ERROR` | Request payload failed validation.   |
| 404  | `NOT_FOUND`        | The requested resource is missing.   |
| 401  | `UNAUTHORIZED`     | Missing or invalid credentials.      |
| 429  | `RATE_LIMITED`     | Too many requests.                   |
| 500  | `INTERNAL_ERROR`   | Unexpected server error.             |

## Endpoint examples

### `GET /api/v1/health`

Health probe. Aggregates each component (database, and cache when configured);
returns `200` when healthy and `503` when the overall status is `down`. The
`/status` page renders this report.

```json
{
  "data": {
    "status": "ok",
    "checkedAt": "2026-06-23T10:00:00.000Z",
    "version": "6df0f02",
    "components": [
      { "name": "database", "status": "up", "latencyMs": 12 },
      { "name": "cache", "status": "up", "latencyMs": 8 }
    ]
  }
}
```

### `POST /tasks`

Create a task.

```http
POST /api/v1/tasks
Content-Type: application/json

{ "listId": "1b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed", "title": "Send invites" }
```

`201 Created`

```json
{
  "data": {
    "id": "3f2504e0-4f89-41d3-9a0c-0305e82c3301",
    "listId": "1b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed",
    "title": "Send invites",
    "status": "pending",
    "observation": null,
    "assigneeId": null,
    "createdAt": "2026-06-21T10:00:00.000Z",
    "completedAt": null
  }
}
```

The full surface (lists, tasks, recurring tasks, sharing, members, analytics,
notifications, AI generation, auth, API keys) is documented in the live OpenAPI
document. Browse it interactively at `/docs`; every entry is generated from the
Zod DTOs, so `/docs` stays authoritative.
