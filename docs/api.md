# API reference

TaskIn exposes a versioned, white-label REST API under `/api/v1`. It is designed
to be consumed independently of the TaskIn web UI.

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

## Error codes

| HTTP | `code`             | Meaning                              |
| ---- | ------------------ | ------------------------------------ |
| 422  | `VALIDATION_ERROR` | Request payload failed validation.   |
| 404  | `NOT_FOUND`        | The requested resource is missing.   |
| 401  | `UNAUTHORIZED`     | Missing or invalid credentials.      |
| 429  | `RATE_LIMITED`     | Too many requests.                   |
| 500  | `INTERNAL_ERROR`   | Unexpected server error.             |

## Endpoints (current scaffold)

### `GET /health`

Liveness probe.

```json
{ "data": { "status": "ok", "version": "0.1.0" } }
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

The full surface (lists, tasks, sharing, members, analytics, auth) is delivered
incrementally - see [DEVELOPMENT_PLAN.md](../DEVELOPMENT_PLAN.md). Each new endpoint
ships with its OpenAPI entry so `/docs` stays authoritative.
