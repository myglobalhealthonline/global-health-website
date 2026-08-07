-- Phase 5 deploy step (§3.8): resolve every pre-existing cart's benefit choice.
--
-- `Cart.benefitSource` shipped in the phase 4 migration defaulting to UNSET,
-- deliberately un-backfilled. A backfill then would only have covered carts
-- that existed at that moment; every cart created between phase 4 and this
-- deploy would still be UNSET when §6.4's switch went live. It belongs here,
-- next to the code that reads it.
--
-- This is an OPTIMISATION, not the correctness mechanism. Checkout resolves
-- UNSET at runtime — no eligible sources means NONE and the order proceeds —
-- so a cart this misses, or one created a second after this runs, still works.
-- What the backfill buys is that an existing corporate member with a cart in
-- flight is not asked to walk a benefit step they never saw.
--
-- Effect: those carts become "full price, no automatic corporate discount"
-- until the patient passes the benefit step. That IS the phase 5 behavioural
-- change, applied to carts already open.

UPDATE "Cart" SET "benefitSource" = 'NONE' WHERE "benefitSource" = 'UNSET';
