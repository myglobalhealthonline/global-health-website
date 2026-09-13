# Spain implementation handoff — 13 September 2026

Nothing from this package is live. Research and exact local candidates exist;
clinical approval, authenticated row reconciliation, PostgreSQL rehearsal and
production publication do not. Canonical status is ledger §56.

## Reuse and proof

Current Romania source was inspected beyond research commit 39656572 and
implementation commit a560643b, including subsequent editorial work. Spain reuses
the current HTML parser, snapshot/mutation helpers, rehearsal and CMS transaction
owner. It does not copy Romania's reviewer approval or administrative rules.

From repository root:

```powershell
node seo/spain/build-package.mjs
node backend/scripts/prepare-spain-seo.mjs
node --test backend/scripts/spain-seo.test.mjs backend/scripts/romania-clinical-review.test.mjs backend/scripts/prepare-romania-seo.test.mjs
```

Type-check backend per package with `pnpm --filter backend typecheck`. This machine's
pnpm wrapper failed; the successful fallback, run with backend as working directory,
was `node --max-old-space-size=8192 node_modules/typescript/bin/tsc --noEmit`.
The default 2 GB heap exhausted memory. No frontend code changed.

## Required facts and exact approval

The readable packet is `content-briefs/review-packet.html`; it includes before/after
fields, FAQ replacements/additions and seven link changes. The review register has
140 current payload hashes and blank approval fields. No clinical review completed.

Ledger §43.5 requires “A named Spain-registered clinician reviewer, with a doctor id”
and “A review-age policy.” Section 43.4 requires the gate “at the point of write.”
Supply the reviewer identity and policy, then obtain approval of the reconciled
exact manifest, not a blanket approval of these research conclusions.

Operations dependencies are separate: clarify Luz Marina Zuluaga Ríos's official
ALTA sin ejercicio entry versus bookability; obtain Tomás Ruiz Palacios's named
official registration record and evidence for Wang's specialist-service scope.
Fidel Mesa has no current open slot. These observations do not authorize changing
credentials, disabling doctors, assigning care or silently unpublishing pages.

## Authenticated preparation

Automatic approval review rejected two production read-only snapshot attempts,
including the restricted projection, because it could not verify authorization.
Explicit owner confirmation is pending; do not bypass the block or ask for secrets.
`raw/storage-export-scope.md` documents the projection and established secret route.
Neither exporter attempt ran, and no patient/appointment tables are in its scope.

After confirmation, run `node backend/scripts/spain-seo-storage.mjs seo/spain/raw/storage-preflight-2026-09-13.json` through established
secret configuration. It exclusively creates that snapshot;
do not overwrite evidence silently. Inspect hidden rows, all doctor countries and
all service assignments, refresh affected public APIs, then rerun the planner.
Missing ES FAQ translations or base/override mismatches require explicit source
reconciliation. Public fingerprints alone are insufficient.

The resulting manifest must say `storage prepared; no approval or publication`.
Review its blockers individually. It groups full logical service/profile changes
and links, binds the snapshot and resulting clinical states, and preserves all
unrelated rows. The current file says `awaiting authenticated storage; public drafts
only` and has zero executable groups. It is not a completed production dry-run.

Rehearse the resulting exact operations in isolated PostgreSQL, compare all
protected values, inject rollback failure and perform a full rollback. This step
has not been run; mocks do not establish production schema compatibility.

## Publication sequence after approval and production authorization

Record genuine review evidence in `clinical-approval.json`: manifestSha256,
reviewerDoctorId, reviewerName, evidence, reviewedAt, maxAgeDays, and each group's
key/approvedSha256. Add the identical reviewer/date/evidence and resulting hashes
to APPROVED_SPAIN_STATES in the existing backend content gate, and the owner-chosen
age to SPAIN_REVIEW_POLICY. Tests use synthetic approvals only and clean them up.

Obtain authorization for the tested backend deployment and exact production batches.
Deploy the shared mutation-boundary enforcement before content changes; record the
actual deployment ID in `enforcement-deployment.json` and verify deployed source.
That receipt is an operator attestation, not an automatic Railway status query.
The gate currently contains no Spain approvals and has not been deployed.

For the first prepared group, run from root through established configuration:

```powershell
node backend/scripts/apply-spain-seo.mjs --group=KEY
node backend/scripts/apply-spain-seo.mjs --group=KEY --apply --confirm=EXACT_GROUP_SHA256
node seo/spain/verify-public.mjs --group=KEY
```

Default is read-only. Apply requires exact approval, current reviewer/policy,
deployment receipt and explicit group hash. It locks updated rows in SERIALIZABLE,
compares the whole relevant snapshot, saves before values before writing, checks
all protected state and commits one group. A repeat validates approval again and
preserves an existing publicly verified receipt.

The group order is manifest order; later groups depend on earlier groups' verified
receipts. Their production dry-runs are therefore sequential, not independent.
Use offline `rehearse` for cumulative preflight. Prioritize appropriate groups before
approval by changing planner order and regenerating all dependent state hashes.

Public verification fetches every affected locale and checks status, redirect,
metadata, H1, exact native FAQ/schema, duplicates, changed body passages, canonical,
alternates, robots and obsolete links. It saves a public receipt. Then inspect
booking/profile rendering in the browser without payment, confirm API operational
fields against the transaction readback, and record the evidence. Only after those
checks may the applied receipt's publicVerified become true. Update ledger and
implementation log before the next group. No such receipts exist today.

## Rollback preparation

Each applied group saves `raw/rollout/KEY-before.json` with the exact original rows
before any mutation. Manifest update operations include their before row; inserted
FAQ IDs are deterministic and explicitly listed. Preserve this snapshot with the
matching mutation/public receipts and deployment source.

If a transaction fails, the runner rolls it back. After a committed batch, stop
subsequent groups and prepare an exact inverse of that group: restore only updated
columns from before values; delete only inserted FAQ translations, then their base
FAQ rows. Never restore the whole catalogue over concurrent changes. Check current
rows against the committed expected state and refuse drift. Later applied groups
must be reversed first. Validate the inverse and protected state in a transaction,
obtain explicit rollback authorization/required clinical state approval, then apply
and repeat public/browser verification. An inverse production runner is deliberately
not fabricated before authenticated rows exist. No real rollback rehearsal has run.

No commit or deployment identifier exists for this preparation. Integrate the exact
tested source before a later release; never claim local files are deployed. Keep
September 18/24 checks unchanged and register 30/60/90 dates only at publication.
