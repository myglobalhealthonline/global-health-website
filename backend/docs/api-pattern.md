# API Pattern — replicate per entity

Status: **Countries vertical is the anchor.** Read `backend/src/routes/admin/countries.ts` and `frontend/lib/api/admin-countries.ts`, then copy that shape for the next entity. The conventions below are non-negotiable so mobile + web see one consistent API.

## Wire-format envelopes

Every endpoint returns one of these JSON shapes. Imported from `@gh/shared`:

```ts
// Successful read
{ ok: true, data: T }

// Successful write (POST/PATCH/DELETE)
{ ok: true, data: T, revalidate?: string[] }

// Any failure
{ ok: false, error: { code, message, fieldErrors? } }
```

`error.code` is a stable machine-readable string (`VALIDATION_FAILED`, `UNAUTHENTICATED`, `FORBIDDEN`, `NOT_FOUND`, `CONFLICT`, `RATE_LIMITED`, `PAYLOAD_TOO_LARGE`, `INTERNAL_ERROR`). Clients switch on it. `error.message` is human text — display verbatim only if you trust the source.

`revalidate` is an array of frontend paths the backend asks the caller to invalidate. The web HTTP wrapper loops over them and calls `revalidatePath`. Mobile ignores.

## Route file structure

`backend/src/routes/admin/<entity>.ts` exports one function per HTTP verb the entity supports:

| Function | Mounted at | Method |
|---|---|---|
| `list<Entity>` | `/api/v1/admin/<plural>` | GET |
| `get<Entity>` | `/api/v1/admin/<plural>/:id` | GET |
| `create<Entity>` | `/api/v1/admin/<plural>` | POST |
| `update<Entity>` | `/api/v1/admin/<plural>/:id` | PATCH |
| `deactivate<Entity>` | `/api/v1/admin/<plural>/:id` | DELETE |

Use resource-style paths (`/countries/:id`) not RPC (`/country.update`).

## Required steps in every handler

Copy from `countries.ts`. Each handler does this in order:

1. **Auth gate** — `const session = await requireAdmin(req, res); if (!session) return;`
2. **Validate input** — `const parsed = <entity>CreateSchema.safeParse(body); if (!parsed.success) { sendValidation(res, fieldErrorsFromZod(parsed.error)); return; }`
3. **Run the Prisma operation** in a try/catch
4. **Map known errors** — `P2002` → `sendConflict`, `P2025` → `sendNotFound`
5. **Write audit row** — `await writeAudit({ userId: session.sub, action: "<entity>.<verb>", entity: "<Entity>", entityId, metadata })`
6. **Send response** — `sendOk(res, toDto(record), { revalidate: revalidatePaths })`

The helpers (`sendOk`, `sendValidation`, `sendConflict`, `sendNotFound`, `requireAdmin`, `readJson`) live in `backend/src/http/`. Don't reimplement them.

## DTO mapping

Define a `toDto(prismaRecord) → EntityDTO` function at the top of the route file. Convert `Date` → ISO string. Strip Prisma internals (`_count` → `counts`). The DTO type lives in `@gh/shared/schemas/<entity>` so both backend and frontend (and mobile) import the same shape.

## Validation schemas

Live in `packages/shared/src/schemas/<entity>.ts` so both ends validate identically:

- `<entity>WritableSchema` — base fields shared by create + update
- `<entity>CreateSchema` — extends writable, adds defaults for create-only fields
- `<entity>UpdateSchema` — `.partial()` of writable plus any update-only fields
- `<entity>ListQuerySchema` — query params for list (q, status filters, page, limit)

## Revalidation paths

Each write returns an array of frontend admin paths to invalidate. Typical:

- Create → `["/admin/<plural>"]`
- Update → `["/admin/<plural>", "/admin/<plural>/<id>"]`
- Deactivate → same as update

If the change is publicly visible (PublishStatus toggle), include the public-facing paths too (`/<country-slug>`, `/<country-slug>/services/<slug>`, etc).

## Mounting in server.ts

In `backend/src/server.ts`, add a top-level `if (url.pathname.startsWith("/api/v1/admin/<plural>"))` block. Inside, split on the remainder to choose the handler. See the Countries block in `server.ts` as template — copy + rename.

Don't move all routes to a router framework yet — we're keeping raw Node for now. If route count grows past 10 entities, swap to Hono in one PR.

## Frontend wrapper file

`frontend/lib/api/admin-<entity>.ts` exports thin async functions: `listAdmin<Entity>`, `getAdmin<Entity>`, `createAdmin<Entity>`, `updateAdmin<Entity>`, `deactivateAdmin<Entity>`. Each calls `adminApi<T>(path, init)` from `@/lib/api/admin-client`. Types come from `@gh/shared/schemas/<entity>`. Never duplicate the type definitions.

## Server Actions migration

`frontend/app/(admin)/admin/<entity>/actions.ts` keeps the same exported names so forms don't change. Inside each action:

1. Parse the FormData with a form-flavoured Zod schema (CSV → array, "" → null, "on" → boolean). This stays in the frontend because it's a wire-format adapter.
2. Call the HTTP wrapper.
3. If `result.ok === false`, return `asActionResult(result)`.
4. Otherwise `redirect()` or return `{ ok: true }`.

No more `import { prisma } from "backend"`. No more `revalidatePath()` (the HTTP wrapper does it from the backend echo).

## Mobile-readiness checklist per entity

When you finish a vertical, confirm:

- [ ] Bearer token works: `curl -H "Authorization: Bearer $TOKEN" $BACKEND/api/v1/admin/<plural>`
- [ ] Cookie works (web): the wrapper in `admin-client.ts` reads it from `cookies()` and forwards as Bearer
- [ ] Validation errors return `{ ok: false, error: { code: "VALIDATION_FAILED", fieldErrors: {...} } }`
- [ ] Create returns 201, includes `revalidate: ["/admin/<plural>"]`
- [ ] Update/delete return 200, include `revalidate: ["/admin/<plural>", "/admin/<plural>/<id>"]`
- [ ] Audit row written for every mutation (check `/admin/audit`)
- [ ] DTO is JSON-safe (no `Date`, no `bigint`)

## Order to do next

1. `categories` — simplest M:N (Category × Country) toggle
2. `appointments` — read-mostly + status state machine
3. `doctors` — M:N with countries (similar shape to categories)
4. `services` — biggest, 4-type filter + category link
5. `users` — SUPER_ADMIN-gated, mostly reuses session helper

Each vertical: ~1 day backend + 0.5 day frontend wrappers + 0.5 day page migration = 2 days. Five entities ≈ 2 weeks for one dev. Two devs can split frontend/backend per entity in parallel and halve it.
