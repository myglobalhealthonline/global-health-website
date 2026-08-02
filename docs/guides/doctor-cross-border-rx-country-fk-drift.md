# DoctorCrossBorderRxCountry — missing FK constraints (2026-08-02)

## What happened

`backend/prisma/schema.prisma`'s `DoctorCrossBorderRxCountry` model declares
`doctor`/`country` relations (`onDelete: Cascade`), but the migration that
created the table —
[`20260726120000_doctor_cross_border_rx_country`](../../backend/prisma/migrations/20260726120000_doctor_cross_border_rx_country/migration.sql) —
only ever added the table, unique index, and two lookup indexes. It never
added the FK constraints. This wasn't a later drift; the very first migration
for this table didn't match the model. `prisma migrate dev` against a fresh
database surfaces the gap as diff noise.

Since Railway's `preDeployCommand` runs `prisma migrate deploy`
(`backend/railway.json`), whatever's committed to `backend/prisma/migrations/`
is exactly what's applied in production — so production had the same gap.

## Fix

[`20260802050000_doctor_cross_border_rx_country_fks`](../../backend/prisma/migrations/20260802050000_doctor_cross_border_rx_country_fks/migration.sql)
adds only the two missing FKs (`ON DELETE CASCADE ON UPDATE CASCADE`,
matching every other `Doctor`/`Country` FK in the schema). Nothing else
bundled in.

## Verification before applying

Checked production for rows that would violate the new constraints:

```sql
SELECT dcbrc.id, dcbrc."doctorId", dcbrc."countryId"
FROM "DoctorCrossBorderRxCountry" dcbrc
LEFT JOIN "Doctor" d ON d.id = dcbrc."doctorId"
LEFT JOIN "Country" c ON c.id = dcbrc."countryId"
WHERE d.id IS NULL OR c.id IS NULL;
```

0 orphans out of 9 total rows. Safe to apply.

Note for future changes to this table: `purgeAdminDoctor`
(`backend/src/modules/doctors/doctors.service.ts`) and `purgeAdminCountry`
(`backend/src/modules/countries/countries.service.ts`) hard-delete
`Doctor`/`Country` rows directly. Before this fix, that could silently orphan
`DoctorCrossBorderRxCountry` rows; now the FK's `ON DELETE CASCADE` cleans
them up automatically.

## How it was applied to production

Normally `prisma migrate deploy` (via Railway's pre-deploy step) applies every
pending migration in order. At the time this fix landed, the newest committed
migration ahead of it in the repo
(`20260802040127_add_patient_tax_id_searched_audit_action`) was unrelated,
in-flight work from a different task that hadn't shipped yet — bundling it in
would have deployed that change prematurely.

So this one migration was applied out-of-band instead of via full
`migrate deploy`:

1. Ran the migration's own SQL directly against production with `psql`.
2. Ran `prisma migrate resolve --applied 20260802050000_doctor_cross_border_rx_country_fks`
   so Prisma's `_prisma_migrations` table records it as applied — the next
   real `prisma migrate deploy` (e.g. via a Railway deploy) will skip it and
   only apply whatever's still pending, instead of re-running or erroring.

This is the pattern to follow any time a migration needs to reach production
ahead of other migrations already committed but not yet deployed.
