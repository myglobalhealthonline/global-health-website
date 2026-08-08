# `20260808120000_memed_booking` — applied to production, in no branch (2026-08-08)

## What happened

Production (`trolley.proxy.rlwy.net:31877`) has a migration recorded in
`_prisma_migrations` that exists in no git ref:

| | |
| --- | --- |
| Migration | `20260808120000_memed_booking` |
| Applied | 2026-08-07T20:22:36.790Z → 20:22:38.166Z (1.4 s) |
| `applied_steps_count` | 1 |
| `rolled_back_at` / `logs` | null / null |
| Checksum | `17697e6f43d558f97194ba5cf01dd557b8ec4f854cbb3ffc426d4d2dbb468f74` |

Searched every local and remote ref (`refs/heads` + `refs/remotes`, 30+
branches including all dependabot ones) for a matching migration directory and
for the string `memed` in `backend/src` and `frontend`. **Zero hits on both.**
It was deployed from an unpushed local branch or applied by hand.

Dev (`hayabusa.proxy.rlwy.net:49401`) does not have it. Production alone does.

## What it created

One table, `MemedBooking`, with **zero rows**. Nothing in the repo reads or
writes it.

```
id                text      PK
orderId           text      NOT NULL, UNIQUE, FK -> "Order"(id) ON DELETE CASCADE ON UPDATE CASCADE
status            text      NOT NULL DEFAULT 'PENDING'
memedReferenceId  text      NULL
responseSnapshot  jsonb     NULL
error             text      NULL
requestedAt       timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
completedAt       timestamp NULL
createdAt         timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
updatedAt         timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP

INDEX "MemedBooking_status_createdAt_idx" (status, "createdAt")
```

The shape is an outbound-integration job record — one row per `Order`, a
status, the provider's reference, a response snapshot and an error field.
Consistent with a MEMED (Brazilian e-prescription platform) booking hand-off
that was started and never landed.

## Why it matters, precisely

The commonly stated risk — "the next `migrate deploy` will fail on a migration
it cannot find" — is **not** what happens. `migrate deploy` tolerates rows in
`_prisma_migrations` with no local directory; it only applies what is pending.
This was observed directly: dev carries two such orphans
(`20260717090000_brazil_consent_capabilities`,
`20260717160000_order_access_capabilities`) and `migrate deploy` ran fine
against it throughout phase 7.

The two real hazards are:

1. **A regenerated migration will silently drop the table.** `schema.prisma`
   has no `MemedBooking` model, so `prisma migrate diff` against production
   sees the table as drift and emits `DROP TABLE "MemedBooking"`. Phase 7's
   experience is that `migrate diff` output gets pasted into a migration file
   with only the obviously-wrong lines cut — and a `DROP TABLE` for a model
   nobody recognises reads as legitimate cleanup.
2. **`prisma migrate dev` refuses to run at all** against a database with an
   unknown applied migration, which is part of why that command is already
   unusable in this repo.

## Why the directory was NOT reconstructed

Recreating `backend/prisma/migrations/20260808120000_memed_booking/` so history
matches production is the obvious fix, and it does not work: Prisma verifies
the **checksum** of every applied migration. Hand-written SQL that produces an
identical schema will not hash to
`17697e6f43d558f97194ba5cf01dd557b8ec4f854cbb3ffc426d4d2dbb468f74`, and
`migrate deploy` then fails on every subsequent run with a checksum mismatch —
turning a dormant inconsistency into a broken deploy pipeline.

Landing the directory is only safe with the **original file, byte for byte**,
from whoever deployed it.

## What to do

1. **Find the author.** The Railway dashboard's deploy history for the
   production backend service around 2026-08-07T20:22Z names the branch and
   commit. (Not read here: the Railway CLI in this clone is linked to the
   *Development* environment, and re-linking mutates shared local state while
   other sessions are working in the same checkout.)
2. **If the original migration file is recovered:** commit it verbatim to
   `main`, add the `MemedBooking` model to `schema.prisma`, and confirm
   `migrate deploy` against dev applies it cleanly.
3. **If it cannot be recovered:** decide deliberately between
   - adding the model to `schema.prisma` and a *new* migration that is a no-op
     against production (`CREATE TABLE IF NOT EXISTS …`) so schema and history
     converge going forward, or
   - dropping `MemedBooking` from production in its own reviewed migration —
     defensible while it holds zero rows and no code references it.

Until one of those happens, **anyone hand-editing a generated migration must
not accept a `DROP TABLE "MemedBooking"` line.** That is the one way this
becomes data loss rather than untidiness.

## Related

- `docs/plans/private-membership-plans-implementation.md` §3.8 — the standing
  rule that generated migrations are reviewed line by line before committing,
  and the list of DDL `migrate diff` proposes dropping on every run.
- The seven orphaned May-2026 migrations, same shape, same cause.
