-- Admin discretionary discount on manual bookings (walk-in / phone-in goodwill,
-- staff comp). Audit-only columns: subtotalCents / totalCents / OrderItem prices
-- are already net of the discount, mirroring OrderItem."corporateDiscountCents".
-- IF NOT EXISTS: patch scripts may add the columns before this migration runs.
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "discountPercent" INTEGER;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "discountCents" INTEGER;
