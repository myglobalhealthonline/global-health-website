# Applied one-off scripts

Scripts in this folder have already been run against production and are kept
only as a record of what was applied. They are idempotent, so re-running one is
harmless, but nothing here is part of a routine workflow.

A script belongs here once its effect is live. Scripts that are still pending,
that run once per environment (`backfill-blind-index.ts`,
`backfill-encrypt-clinical-fields.ts`, `backfill-base-slots.ts`), or that are
wired into `package.json` stay in `backend/scripts/`.

Paths are one level deeper here, so imports read `../../src/...` and shared
fixtures read `../data/...`.
