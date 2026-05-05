# Admin API (Phase 2)

Base URL examples:

- local: `http://localhost:4000`

All admin endpoints require:

- header `Authorization: Bearer <ADMIN_API_TOKEN>`

If token missing in backend runtime env, API returns:

- `503` + `{"ok":false,"message":"Admin auth is not configured"}`

If token missing/invalid in request:

- `401` + `{"ok":false,"message":"Missing bearer token"}` or `Invalid admin token`

## Endpoints

### `GET /api/admin/appointments`

Returns up to 200 newest appointments for queue review.

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
    ]
  }
}
```

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

Allowed statuses:

- `REQUEST_RECEIVED`
- `UNDER_REVIEW`
- `CONTACTED`
- `CANCELLED`
- `COMPLETED`

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

## Security Limits (Phase 2)

- auth is env-token gate, not per-user identity
- no per-admin audit trail yet
- no route-level RBAC beyond shared admin token
- token rotation is manual via env update and restart
