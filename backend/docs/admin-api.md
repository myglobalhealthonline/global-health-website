# Admin API (Phase 2 + 2.1 + 3.1 countries + 3.2 services + 3.3 doctors + 3.4 pricing + 3.5 assets)

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

---

## Services (Phase 3.2)

Same bearer auth as other admin routes.

Prisma `Service` model fields used by admin APIs (no invented columns):

| Field | Notes |
| --- | --- |
| `countryId` | Required on create; FK to `Country` |
| `specialtyId` | Optional; **category/type** is modeled here (`Specialty`), must belong to the effective country |
| `slug` | Required on create; URL-safe segment; **`@@unique([countryId, slug])`** |
| `name` | Required on create (display title) |
| `summary` | Optional text |
| `legacyPath` | Optional; when set must start with `/` |
| `durationMinutes` | Optional; if present must be a **positive** integer |
| `basePriceCents` | Optional; if present must be **≥ 0** |
| `currencyCode` | Optional string (max 8 chars) |
| `isActive` | Boolean; default `true` on create |
| `consultationSetting`, `bookingSetting` | JSON — **not** editable via Phase 3.2 admin payloads (schema follow-up if needed) |

**Schema gaps (follow-up migrations / admin UX):** no separate long **`description`** column; no **`sortOrder`**; no direct **`Asset`** relation on `Service`; JSON booking/consultation settings not exposed in admin UI yet.

### Helper: `GET /api/admin/specialties`

Query: **`countryId`** (required) — internal country id.

Returns `{ specialties }` for specialties scoped to that country (for create/edit dropdowns). Invalid/missing country → `400`.

### `GET /api/admin/services`

Paginated list with filters.

**Query parameters:**

| Param | Default | Max | Description |
| --- | --- | --- | --- |
| `page` | `1` | — | 1-based page index |
| `pageSize` | `20` | `100` | Rows per page |
| `countryId` | — | — | Filter by internal country id |
| `countryCode` | — | 8 chars | Filter by country `code` (e.g. `ie`) |
| `specialtyId` | — | — | Filter by specialty (category/type) |
| `isActive` | — | — | `true` / `false` (string or boolean coerced) |
| `search` | — | 120 chars | Case-insensitive substring on `name`, `slug`, `summary` |

Invalid query → `400` with Zod `details`.

Response shape includes `items`, `pagination` (`page`, `pageSize`, `total`, `totalPages`). When `page` is beyond the last page and `total > 0`, the service clamps to the last page (same pattern as appointments list).

### `GET /api/admin/services/:id`

Param `id`: Prisma `Service` id (`cuid`).

Returns `{ service }` with `country` and `specialty` includes, or `404`.

### `POST /api/admin/services`

Creates a service. Body validated by `adminServiceCreateBodySchema`:

- **`countryId`** required (country must exist — otherwise `400`).
- **`slug`** required; lowercase URL-safe (`a-z`, `0-9`, hyphens; no leading/trailing hyphen).
- **`name`** required (maps to marketing “title”).
- **`specialtyId`** optional; if set, must reference a specialty for the **same** country (`400` if invalid).
- **`durationMinutes`** / **`basePriceCents`** optional with positivity / non-negativity rules above.
- Duplicate **`countryId` + `slug`** → **`409`** (`P2002`).

### `PATCH /api/admin/services/:id`

Partial update; empty body → `400`. Changing `countryId` and/or `specialtyId` re-validates specialty against effective country. Same **`409`** on unique violation.

### `DELETE /api/admin/services/:id`

**Soft-disable only:** sets **`isActive: false`**. Does not remove the row. Re-enable via **`PATCH`** with `"isActive": true`.

**Public behavior unchanged:** public `GET /api/services` continues to list **`isActive: true`** only — marketing pages keep using existing adapters/fallbacks when the backend is unavailable; Phase 3.2 does **not** force public pages to depend on admin-managed rows exclusively.

---

## Doctors — public profiles only (Phase 3.3)

Same bearer auth as other admin routes.

**Product rule:** `Doctor` rows are **public directory / CMS content** for this website. They are **not** login identities. **No doctor dashboard, doctor portal, or credentials** are part of this API — deferred elsewhere.

Prisma `Doctor` fields exposed via admin (aligned with schema):

| Field | Notes |
| --- | --- |
| `countryId` | Required on **create**; **cannot be changed** via `PATCH` (use deactivate + new profile for another country) |
| `slug` | Required on create; URL-safe; **`@@unique([countryId, slug])`** |
| `fullName` | Required on create |
| `title` | Required on create |
| `bio` | Optional; max length enforced in Zod |
| `active` | Boolean (`true` / `false` in JSON); maps to Prisma `active` |
| Specialties | Many-to-many via **`DoctorSpecialty`** → **`Specialty`**; create/update send **`specialtyIds`**: string[]. Each specialty must belong to the doctor’s country |
| Profile image | Optional **`profileImagePath`**: `https://…` or site path starting with **`/`**. Persisted as one **`Asset`** row (`kind` **`IMAGE`**, stable key `doctor-{doctorId}-profile`) |

**Schema gaps (follow-ups):** no **`languages`** column; no **`qualifications`** array; no **`imageUrl`** on `Doctor` (image uses **`Asset`** link); no separate **visibility** flag beyond **`active`**.

### `GET /api/admin/doctors`

Paginated list.

**Query parameters:**

| Param | Default | Max | Description |
| --- | --- | --- | --- |
| `page` | `1` | — | 1-based |
| `pageSize` | `20` | `100` | Rows per page |
| `countryId` | — | — | Internal country id |
| `countryCode` | — | 8 chars | Country code filter |
| `specialtyId` | — | — | Doctors with this specialty (junction match) |
| `isActive` | — | — | Maps to Prisma **`active`** (`true`/`false` coerced from query string) |
| `search` | — | 120 chars | Substring on **`fullName`**, **`title`**, **`bio`** (case-insensitive) |

Response: **`items`**, **`pagination`** (with page clamping when `page` exceeds last page).

### `GET /api/admin/doctors/:id`

Returns **`doctor`** with **`country`** (includes **`teamPath`**), **`specialties`** (with **`specialty`**), **`assets`** (IMAGE rows for this doctor).

### `POST /api/admin/doctors`

Validated by **`adminDoctorCreateBodySchema`**. Duplicate **`countryId + slug`** → **`409`** (`P2002`).

### `PATCH /api/admin/doctors/:id`

Partial update; empty body → **`400`**. **`countryId`** change → **`400`** (specialties are country-scoped). Clearing **`profileImagePath`** with **`null`** removes the profile **`Asset`** when provided.

### `DELETE /api/admin/doctors/:id`

**Soft-disable:** sets **`active: false`**. Public **`GET /api/doctors`** continues to filter **`active: true`** only — unchanged.

**Public safety:** marketing pages are **not** switched to hard-require these rows; existing **fallback adapters** remain when the API is unavailable.

---

## Pricing plans — display only (Phase 3.4)

Same bearer auth as other admin routes.

**Pricing vs payments:** these endpoints manage **`PricingPlan`** rows for **public marketing pricing**. They do **not** create payment sessions, collect cards, integrate Stripe (or any provider), confirm paid appointments, or process money. Future payment flows may **reference** this data later; this phase does not.

Prisma **`PricingPlan`** fields:

| Field | Notes |
| --- | --- |
| `countryId` | Required on **create**; **cannot be changed** via **`PATCH`** |
| `slug` | Required; URL-safe; **`@@unique([countryId, slug])`** |
| `name` | Required |
| `description` | Optional |
| `priceCents` | Non-negative integer (minor units) |
| `currencyCode` | Required; must exist on **`Currency`** table (validated case-insensitively, stored uppercase) |
| `interval` | Required string (e.g. `month`, `year`, `once`) — product-defined; max length in Zod |
| `isActive` | Boolean (default `true` on create) |

**Schema gaps:** no **`serviceId`** link to **`Service`**; no **`features`** list; no **`sortOrder`**. Filter **`serviceId`** on list is **not** supported until the schema gains a relation.

### `GET /api/admin/pricing`

Paginated list.

**Query:** `page`, `pageSize`, `countryId`, `countryCode`, `isActive`, `search` (matches **`name`**, **`slug`**, **`description`**).

### `GET /api/admin/pricing/:id`

Returns **`plan`** with **`country`**, or **`404`**.

### `POST /api/admin/pricing`

Validated by **`adminPricingCreateBodySchema`**. Duplicate **`countryId + slug`** → **`409`**.

### `PATCH /api/admin/pricing/:id`

Partial update; empty body → **`400`**. **`countryId`** change → **`400`**. Unknown **`currencyCode`** → **`400`**.

### `DELETE /api/admin/pricing/:id`

**Soft-disable:** sets **`isActive: false`**. Public **`GET /api/pricing`** continues **`isActive: true`** only — unchanged.

**Public safety:** fallback adapters remain; pages are not forced to depend on CMS pricing rows exclusively.

---

## Assets — metadata only (Phase 3.5)

Same bearer auth as other admin routes.

**Upload/storage boundary:** admin APIs manage **`Asset`** **rows** (kind, key, path/URL, alt text, optional country/doctor link, **`usageNote`**). They do **not** upload bytes, store BLOBs in Postgres, or integrate S3 / Cloudflare R2 / Vercel Blob / other providers in this phase. Paths may point at **`/public`** files or future CDN URLs.

Prisma **`Asset`** fields (after Phase 3.5 migration):

| Field | Notes |
| --- | --- |
| `countryId` | Optional (`null` = global) |
| `doctorId` | Optional; if set, doctor must exist and **`countryId`** is aligned (auto-filled from doctor when omitted) |
| `kind` | **`AssetKind`** enum: `IMAGE`, `ICON`, `LOGO`, `BADGE`, `SOCIAL` |
| `key` | Required; unique together with **`kind`** (`@@unique([kind, key])`) |
| `path` | Required; **`https://`** or absolute **`/`** path; rejects `javascript:`, `data:`, plain `http:` |
| `altText` | Required for **`IMAGE`**, **`ICON`**, **`LOGO`**, **`BADGE`**; optional for **`SOCIAL`** |
| `usageNote` | Optional internal note (usage location / inventory) |
| `isActive` | Boolean (**soft-disable**); public API lists **`isActive: true`** only |

**Schema gaps:** no arbitrary JSON **metadata** column; no binary storage.

### `GET /api/admin/assets`

Paginated list. **Query:** `page`, `pageSize`, `countryId`, `countryCode`, `kind`, `isActive`, `search` (matches **`key`**, **`path`**, **`altText`**, **`usageNote`**).

### `GET /api/admin/assets/:id`

Returns **`asset`** with **`country`** and **`doctor`** summaries.

### `POST /api/admin/assets` / `PATCH /api/admin/assets/:id`

Validated by **`adminAssetCreateBodySchema`** / **`adminAssetUpdateBodySchema`**. **`PATCH`** merges doctor/country rules in the service. Duplicate **`kind + key`** → **`409`**.

### `DELETE /api/admin/assets/:id`

**Soft-disable:** sets **`isActive: false`**.

**Public behavior:** **`GET /api/assets`** returns only **`isActive: true`** — marketing pages keep fallback/temporary local assets when the API is unavailable.

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
- `admin-services.schema.test.ts` (service slug, price/duration, query filters)
- `admin-doctors.schema.test.ts` (doctor slug, name/title, profile image ref, query filters)
- `admin-pricing.schema.test.ts` (pricing slug, negative price, query filters)
- `admin-assets.schema.test.ts` (safe path/URL, alt rules, query filters)
