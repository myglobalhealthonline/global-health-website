-- The pay link now carries "Order"."payAccessNonce" directly instead of a
-- signed capability, so the nonce becomes a lookup key and must be unique.
-- IF NOT EXISTS keeps this re-runnable against the live database, which has
-- drifted from the migration history before.
CREATE UNIQUE INDEX IF NOT EXISTS "Order_payAccessNonce_key"
  ON "Order" ("payAccessNonce");
