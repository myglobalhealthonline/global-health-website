-- When the customer was last told their tracking details.
--
-- `Order.tracking*` has always been save-only: an admin pasted a courier code
-- and nothing was ever sent to the patient. The "Save & notify" action adds the
-- send; this column records the LAST one, so the admin page can show "sent
-- <when>" versus "entered, not yet sent", and a re-send is a deliberate act
-- rather than a guess.
--
-- Null for every existing row, which is accurate — none of them were ever sent.
--
-- Idempotent DDL: safe to re-run against the live Railway DB (see CLAUDE.md /
-- db-migration-workflow — `migrate deploy`, never `migrate dev`).

ALTER TABLE "Order"
  ADD COLUMN IF NOT EXISTS "trackingNotifiedAt" TIMESTAMP(3);
