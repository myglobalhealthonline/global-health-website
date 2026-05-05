# Admin API (Phase 2 + 2.1)

Base URL examples:

- local: `http://localhost:4000`

All admin endpoints require:

- header `Authorization: Bearer <ADMIN_API_TOKEN>`

If token missing in backend runtime env, API returns:

- `503` + `{"ok":false,"message":"Admin auth is not configured"}`

If token missing/invalid in request:

- `401` + `{"ok":false,"message":"Missing bearer token"}` or `Invalid admin token`

## Status workflow (Phase 2.1)

**Terminal statuses** (no further transitions): `CANCELLED`, `COMPLETED`.

**Allowed transitions:**

| From | To |
| --- | --- |
| REQUEST_RECEIVED | UNDER_REVIEW, CONTACTED, CANCELLED |
| UNDER_REVIEW | CONTACTED, CANCELLED |
| CONTACTED | COMPLETED, CANCELLED |
| CANCELLED | _(none)_ |
| COMPLETED | _(none)_ |

**Blocked (examples):** COMPLETED or CANCELLED → anything; CONTACTED → REQUEST_RECEIVED; UNDER_REVIEW → REQUEST_RECEIVED.

Invalid transitions return `400` with a clear message. Setting the status to the **same** value as the current row is a no-op (no error).

## Endpoints

### `GET /api/admin/appointments`

Paginated, filterable queue.

**Query parameters (all optional unless noted):**

| Param | Default | Max | Description |
| --- | --- | --- | --- |
| `page` | `1` | — | 1-based page index |
| `pageSize` | `20` | `100` | Rows per page |
| `status` | — | — | Exact match: `REQUEST_RECEIVED` … `COMPLETED` |
| `countryCode` | — | — | `ie`, `pt`, `sp`, `cz`, `rm` |
| `consultationType` | — | — | `general`, `specialist`, `follow-up` |
| `search` | — | 120 chars | Case-insensitive substring on `fullName`, `email`, `phone` (uses `strpos` / safe parameters) |

Invalid query params return `400` with Zod `details`.

Response:

```json
{
  "ok": true,
  "data": {
    "items": [
      {
        "id": "uuid",
        "country": "ie",
        "consultationType": "general",
        "fullName": "Patient Name",
        "email": "patient@example.com",
        "phone": "+353...",
        "notesPreview": "trimmed preview...",
        "status": "REQUEST_RECEIVED",
        "createdAt": "2026-05-05T17:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "pageSize": 20,
      "total": 0,
      "totalPages": 0
    }
  }
}
```

The service clamps `page` to the last page when `page` is beyond `totalPages` (with `total > 0`).

### `GET /api/admin/appointments/:id`

Zod-validated params:

- `id` must be UUID

Response:

```json
{
  "ok": true,
  "data": {
    "appointment": {
      "id": "uuid",
      "country": "ie",
      "consultationType": "general",
      "fullName": "Patient Name",
      "email": "patient@example.com",
      "phone": "+353...",
      "notes": "full notes",
      "status": "UNDER_REVIEW",
      "createdAt": "2026-05-05T17:00:00.000Z",
      "updatedAt": "2026-05-05T18:00:00.000Z"
    }
  }
}
```

Not found:

- `404` + `{"ok":false,"message":"Appointment not found"}`

### `PATCH /api/admin/appointments/:id/status`

Zod-validated params/body:

- `id` UUID
- body:

```json
{
  "status": "UNDER_REVIEW"
}
```

Allowed **values** for `status` remain all enum labels; **transitions** are enforced as in the matrix above.

Success:

```json
{
  "ok": true,
  "message": "Appointment status updated",
  "data": {
    "appointment": {
      "id": "uuid",
      "status": "UNDER_REVIEW",
      "...": "..."
    }
  }
}
```

Invalid status/body:

- `400` + `{"ok":false,"message":"Invalid appointment status update","details":...}`

Invalid transition or unrecognized stored status:

- `400` + `{"ok":false,"message":"Invalid status transition: ..."}` or unrecognized status message

## Security Limits (Phase 2 / 2.1)

- auth is env-token gate, not per-user identity
- no per-admin audit trail yet
- no route-level RBAC beyond shared admin token
- token rotation is manual via env update and restart
- list `search` is bounded (length, parameterized SQL) to reduce abuse surface

## Local tests

Transition rules are covered by `pnpm --filter backend test` (Node test runner + `appointment-status-transitions.test.ts`).
