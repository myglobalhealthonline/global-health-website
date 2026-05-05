# Admin API (Phase 2 + 2.1 + 3.1 countries)

## Account scope

Admin HTTP APIs are called **only by trusted server-side code** today (`ADMIN_API_TOKEN`). Future **human `ADMIN` users** of this website belong here — **not** doctors (`Doctor` rows are public content, separate doctor portal deferred). Website **`PATIENT`** APIs will be a different surface when auth ships. **Payments:** deferred; when present, booking + payment state may be reviewable together without treating payment as automatic clinical confirmation.

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

---

## Countries (Phase 3.1)

Same bearer auth as other admin routes.

### `GET /api/admin/currencies`

Read-only helper for **country create/edit forms** (currency dropdown). Returns all rows from `Currency`.

Response:

```json
{
  "ok": true,
  "data": {
    "currencies": [{ "id": "cuid", "code": "EUR", "symbol": "EUR", "decimals": 2 }]
  }
}
```

### `GET /api/admin/countries`

Lists **all** countries (including `isActive: false`). Includes `currency`, `countryLocales`, `domains`.

### `GET /api/admin/countries/:id`

Param `id`: internal country id (Prisma `cuid`).

Returns `{ country }` or `404`.

### `POST /api/admin/countries`

Creates a country and related `CountryLocale` rows. Optional `CountryDomain` rows.

**Body fields** (Zod `adminCountryCreateBodySchema`):

| Field | Rules |
| --- | --- |
| `code` | Required, trimmed, max 32; **unique** (DB) |
| `name` | Required, max 200 |
| `slug` | Required, max 120; **unique** |
| `legacyHomePath`, `teamPath`, `generalConsultationPath`, `specialistConsultationPath` | Required; must start with `/`; no spaces |
| `defaultLocale` | `LocaleCode` enum (`EN`, `PT`, `ES`, `CS`, `RO`, `DE`) |
| `supportedLocales` | Non-empty array of locales; **no duplicates**; **must include `defaultLocale`** |
| `currencyId` | Required; must reference existing `Currency` |
| `isActive` | Optional boolean (default `true`) |
| `domains` | Optional `{ domain, isPrimary? }[]`; **at most one** `isPrimary: true`; if none primary, first domain becomes primary |

**Errors:**

- `400` invalid payload / unknown currency / locale merge failure
- `409` unique constraint (`P2002`) on code, slug, path fields, or domain

### `PATCH /api/admin/countries/:id`

Partial update. Empty body rejected (`400`).

- Scalar fields optional.
- If **`supportedLocales`** and/or **`defaultLocale`** present: locales table is rebuilt; effective default after merge must appear in effective locale list (`400` otherwise).
- If **`domains`** key is present (including `[]`): replaces all domains for the country.

Same `409` on unique violations.

### `DELETE /api/admin/countries/:id`

**Soft-disable only:** sets `isActive` to `false`. Does **not** delete the row (FK-safe). Public `GET /api/countries` continues to filter `isActive: true` only — unchanged behavior.

Re-enable via `PATCH` with `"isActive": true`.

## Security Limits (Phase 2 / 2.1)

- auth is env-token gate, not per-user identity
- no per-admin audit trail yet
- no route-level RBAC beyond shared admin token
- token rotation is manual via env update and restart
- list `search` is bounded (length, parameterized SQL) to reduce abuse surface

## Local tests

`pnpm --filter backend test` runs:

- `appointment-status-transitions.test.ts`
- `admin-countries.schema.test.ts` (Zod rules for countries)
