# Stage 4 — Migration Playbook

Drop-in reference for going from your current `countryCode`-string schema to the
country-axis schema, plus the admin app workspace, plus Railway storage.

---

## 1. Monorepo restructure

Current:
```
global-health-website/
├── frontend/   (Next.js — public site)
├── backend/    (Prisma + scripts)
└── pnpm-workspace.yaml
```

After Stage 4:
```
global-health-website/
├── frontend/                  → www.myglobalhealth.online
├── admin/         (NEW)       → admin.myglobalhealth.online
├── backend/                   (Prisma schema + shared client + seed)
├── packages/
│   └── lib/       (OPTIONAL)  shared Zod schemas / types between apps
└── pnpm-workspace.yaml
```

`pnpm-workspace.yaml`:
```yaml
packages:
  - "frontend"
  - "admin"
  - "backend"
  - "packages/*"
```

Bootstrap the admin app:
```bash
cd global-health-website
pnpm create next-app admin --typescript --tailwind --app --no-src-dir --import-alias "@/*"
cd admin
pnpm add @prisma/client jose bcryptjs zod react-hook-form @hookform/resolvers
pnpm add -D @types/bcryptjs
# shadcn:
pnpm dlx shadcn@latest init
```

Both `frontend/` and `admin/` import the Prisma client from `backend/`. In each
app's `package.json`, add `"@global-health/db": "workspace:*"` once you expose
`backend` as a package, or import via a relative path.

---

## 2. Schema migration — what changes

| Before                                 | After                                                              |
|---------------------------------------|--------------------------------------------------------------------|
| `Doctor.countryCode: String`          | `Doctor.countryLinks: DoctorCountry[]` (M:N)                       |
| `Service.countryCode: String?`        | `Service.countryId: String` (FK to `Country`)                      |
| `Appointment.countryCode: String`     | `Appointment.countryId: String` (FK to `Country`)                  |
| No `Country` table                    | `Country` is the axis                                              |
| No `Category` table                   | `Category` global + `CategoryCountry` join                         |
| `UserRole` had `DOCTOR`               | Removed — no doctor logins in this repo                            |
| No publish workflow                   | `PublishStatus { DRAFT, PUBLISHED }` on `Service`, `Country`       |
| No audit                              | `AdminAuditLog`                                                    |

### Two-step migration (safe path)

The naive `prisma migrate dev` will try to drop `countryCode` and recreate FKs —
data loss. Do it in two migrations so existing rows survive:

**Migration A — additive only:**
1. Create `Country`, `Category`, `CategoryCountry`, `DoctorCountry`, `AdminAuditLog`.
2. Add nullable `countryId` to `Service` and `Appointment`.
3. Add `PublishStatus` enum and new columns (`status`, `metaTitle`, etc.) as nullable.
4. `prisma migrate dev --name add_country_axis`

**Backfill script** (run between A and B):
- Insert the 5 countries (the seed handles this).
- For each existing row with `countryCode = "ie"`, set `countryId = <Ireland.id>`.
- For each `Doctor`, create a `DoctorCountry` row.
- Verify counts before continuing.

**Migration B — drop the old:**
1. Make `countryId` NOT NULL on `Service` and `Appointment`.
2. Drop `countryCode` column from `Doctor`, `Service`, `Appointment`.
3. `prisma migrate dev --name drop_country_code`

Once both apply on production, you're done.

---

## 3. Railway bucket setup

Railway Object Storage is S3-compatible. In the admin app you only need
presigned URLs — files never touch your server.

`.env` in `admin/` and `backend/`:
```
RAILWAY_S3_ENDPOINT=https://...railway.app   # from Railway dashboard
RAILWAY_S3_BUCKET=globalhealth-media
RAILWAY_S3_REGION=auto
RAILWAY_S3_ACCESS_KEY=...
RAILWAY_S3_SECRET_KEY=...
RAILWAY_S3_PUBLIC_URL=https://cdn.myglobalhealth.online  # or the raw bucket URL
```

Install the AWS SDK v3 in `admin/`:
```bash
pnpm add @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
```

The upload flow:
1. Admin clicks "Upload" on the doctor edit form.
2. Frontend hits `POST /api/upload/presign` with `{ filename, contentType }`.
3. Server returns `{ uploadUrl, publicUrl }` (presigned PUT, 5-min expiry).
4. Frontend PUTs file directly to `uploadUrl`.
5. On success, frontend saves `publicUrl` to the form, submits to your normal
   `doctor.update` action.

This means: zero server bandwidth, no multipart parsing, works for files up to
several GB. Keep `imageUrl` as a plain string column.

---

## 4. Public site cache invalidation

When admin publishes a service or edits country hero copy, the public site
needs to see it. Pattern with Next.js App Router:

```ts
// frontend: tag the data fetch
const services = await prisma.service.findMany({
  where: { countryId, status: "PUBLISHED" },
  // ... with cache tag via unstable_cache or fetch tags
});

// admin: after a successful save, hit a public-site webhook OR call
// revalidateTag if both apps share a deploy. For separate deploys, expose:
//   POST https://www.myglobalhealth.online/api/revalidate
//   { tag: "country:ie:services", secret: ... }
```

For Vercel + separate apps, the `/api/revalidate` endpoint with a shared
secret is the standard pattern. For Railway, same idea.

---

## 5. Rollout order (concrete)

1. ☐ Apply `schema.prisma` (Migration A — additive).
2. ☐ Run backfill script — countries inserted, FKs populated.
3. ☐ Run Migration B — drop `countryCode`.
4. ☐ Run `pnpm db:seed` — creates super admin + sample data.
5. ☐ Bootstrap `admin/` Next.js app.
6. ☐ Build admin auth (login page, middleware, session cookie).
7. ☐ Build admin shell (layout, sidebar, country dropdown).
8. ☐ CRUD: Countries → Categories → Doctors → Services (×4 types).
9. ☐ Refactor public site to read from DB (replace `data/*.ts` files).
10. ☐ Set up Railway buckets + presigned upload route.
11. ☐ Add revalidation webhook between admin and public site.
12. ☐ Configure DNS: `admin.myglobalhealth.online` → admin deployment.

Steps 1–4 are foundation. Steps 5–8 are the admin build. Step 9 is the moment
the public site actually becomes dynamic. Steps 10–12 are launch polish.

---

## 6. What stays static (don't touch in Stage 5)

These pages remain hand-coded in `frontend/`:
- `/` (root, country picker)
- `/about`, `/careers`
- `/frequent-asked-questions`
- `/blog` and `/post/[slug]` (per your decision: keep blog in code/MDX)
- All `/legal-notices`, `/privacy`, `/terms`, `/refund-policy`, `/cookies`
- `/gift-card` (until/unless you make it admin-managed)

Everything else either reads from DB or routes to a DB-driven dynamic page.
