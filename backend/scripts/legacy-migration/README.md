# Legacy data migration — doctor-dashboard (Mongo + Scaleway) → this app

One-time import of the retiring doctor-dashboard app's data into **this** live
Postgres + Tigris system. Full design + rationale: the approved plan at
`.claude/plans/this-is-the-env-distributed-dusk.md`.

> **This is GDPR special-category patient medical data.** Every dump file is a
> full plaintext copy of medical records. Keep `DUMP_DIR` OUTSIDE the repo, on
> an encrypted disk — never Downloads/Desktop/OneDrive. Never paste a dump, a
> document, or `.env.migration` into a chat/issue/CI log. Delete the dump once
> verified.

## Why not `schema.sql`?

**Do not apply `schema.sql`.** It assumes a greenfield target. This app already
has a richer Prisma schema covering every entity. We map the Mongo data into the
**existing** models with the loaders here, reusing the app's own PHI-crypto,
blind-index and GHN utilities.

## Prerequisites

- `mongodump` + `mongoexport` (MongoDB Database Tools)
- `aws` CLI **or** `rclone` (for the file sync)
- `backend/.env` populated with the LIVE app values, in particular:
  - `DATABASE_URL` — the **public** `proxy.rlwy.net` Railway URL when running from a laptop
  - `PHI_ENCRYPTION_KEY`, `BLIND_INDEX_KEY` — **must match the running app's keys** (loaders refuse to write PHI otherwise)
  - `S3_*` — the Tigris target bucket (`adaptable-shoebox-op6bze2`), already the app's bucket
- Source creds from `.env.migration` (Atlas + Scaleway). Prefer a **read-only** Atlas user.
- Choose a `DUMP_DIR` on an encrypted disk outside the repo.

## Order of operations

Each step is gated. Read the numbers before advancing. `DRY_RUN` defaults to
`true` — nothing writes until you pass `DRY_RUN=false`.

### 0. Back up (untouched rollback artifact)

```bash
mongodump --uri "$SOURCE_MONGO_URI" --archive="$DUMP_DIR/clinic-preflight.archive.gz" --gzip
# optional but recommended: a copy of the bucket
rclone copy scaleway:patient-files "$DUMP_DIR/patient-files-backup"
```

### 1. Export each collection to NDJSON (read-only)

```bash
for c in patients_ireland patients_portugal patients_spain patients_czech \
         patients_romania patients_brazil GlobalDoctors Appointments \
         brazil_consent_submissions reviewinvites; do
  mongoexport --uri "$SOURCE_MONGO_URI" --collection "$c" \
    --jsonFormat=relaxed --out "$DUMP_DIR/$c.ndjson"
done
```

(Do **not** export `sessions` — it is login-audit + express-session interleaved.)

### 2. Audit — read-only, offline

```bash
DUMP_DIR="$DUMP_DIR" node --import tsx scripts/legacy-migration/audit.ts
```

Look at the output. Then **finalize `lib/mapping.ts`**: the per-market field
superset tells you the real source key names — adjust the candidate lists so the
national/tax/passport IDs land in real columns and only genuine overflow goes to
`legacyExtra`.

### 3. Apply the schema migration — ⚠ writes to the LIVE DB

Additive + nullable only (`20260715130000_legacy_import_ids`). Adds the
`legacyMongoId` spine + `MigrationUnresolved`. Per project convention use
`migrate deploy`, never `migrate dev`:

```bash
pnpm --filter backend db:deploy      # prisma migrate deploy
```

### 4. Phase 1 — clinical core (dry-run first, then live)

```bash
# doctors -> Doctor (+ User with forced password reset)
DUMP_DIR="$DUMP_DIR" node --import tsx scripts/legacy-migration/load-doctors.ts        # DRY
DUMP_DIR="$DUMP_DIR" DRY_RUN=false node --import tsx scripts/legacy-migration/load-doctors.ts

# files: Scaleway -> Tigris, keys byte-identical
bash scripts/legacy-migration/sync-files.sh                                            # see script header

# patients -> PatientProfile (dedup by email, PHI-encrypt, blind-index, GHN)
DUMP_DIR="$DUMP_DIR" node --import tsx scripts/legacy-migration/load-patients.ts       # DRY
DUMP_DIR="$DUMP_DIR" DRY_RUN=false node --import tsx scripts/legacy-migration/load-patients.ts

# documents -> MedicalDocument (fileKey verbatim, HEAD-verify each object)
DUMP_DIR="$DUMP_DIR" node --import tsx scripts/legacy-migration/load-documents.ts      # DRY
DUMP_DIR="$DUMP_DIR" DRY_RUN=false node --import tsx scripts/legacy-migration/load-documents.ts
```

### 5. Phase 2 — appointments, notes, consents, reviews

(Built after Phase 1 verifies. Notes become `MedicalNote` rows tied to an
appointment — that is why they wait for appointments.)

### 6. Verify — all must pass before cutover

```bash
DUMP_DIR="$DUMP_DIR" node --import tsx scripts/legacy-migration/verify.ts
```

See the plan's Verification section: row counts vs source, **every**
`MedicalDocument.fileKey` HEADs 200 in Tigris, `MigrationUnresolved` read and
accepted, 5 patients spot-checked end-to-end in the real app.

## Idempotency & safety

- Every loader upserts on `legacyMongoId` (patients on `email` + `legacyMongoIds[]`),
  so a failed/partial run is just re-runnable.
- `DRY_RUN=true` (default) writes nothing — it transforms, validates and logs.
- Unresolved references are written to `MigrationUnresolved`, never silently dropped.
- Object keys are copied **byte-identical** (`patient-files/patient-files/<uuid>.<ext>`);
  the app streams private downloads by key regardless of prefix, so no rewriting.

## After cutover

Rotate the Atlas password + Scaleway keys. Delete `DUMP_DIR`. Keep the preflight
archive + the Scaleway bucket (read-only) for your retention window.
