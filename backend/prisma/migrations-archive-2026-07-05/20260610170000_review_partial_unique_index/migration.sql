-- M15: Replace standard UNIQUE constraint on (provider, externalId) with a
-- partial unique index that only enforces uniqueness when externalId IS NOT NULL.
--
-- PostgreSQL NULL semantics already allow multiple (provider, NULL) rows under
-- the original constraint (NULL ≠ NULL), so existing data is unaffected.
-- The partial index makes the intent explicit: external reviews must be
-- de-duplicated; manually-entered reviews (externalId = NULL) may coexist.
--
-- The index name is kept the same so Prisma does not detect schema drift.

DROP INDEX IF EXISTS "Review_provider_externalId_key";

CREATE UNIQUE INDEX "Review_provider_externalId_key"
  ON "Review"("provider", "externalId")
  WHERE "externalId" IS NOT NULL;
