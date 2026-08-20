-- Self-declared coverage captured in the booking form's coverage picker
-- (membership / corporate healthcare / Global Health plan). Insurance keeps its
-- own columns; this set covers the other three sources. Card numbers are stored
-- as encrypted `phi:v1:` envelopes, same as insurancePolicyNumber.

ALTER TABLE "CartItem"
  ADD COLUMN "declaredCoverageSource" TEXT,
  ADD COLUMN "declaredCoverageRefId" TEXT,
  ADD COLUMN "declaredCoverageCardNumber" TEXT,
  ADD COLUMN "declaredCoveragePriceCents" INTEGER;

ALTER TABLE "OrderItem"
  ADD COLUMN "declaredCoverageSource" TEXT,
  ADD COLUMN "declaredCoverageRefId" TEXT,
  ADD COLUMN "declaredCoverageCardNumber" TEXT,
  ADD COLUMN "declaredCoveragePriceCents" INTEGER;

ALTER TABLE "Order"
  ADD COLUMN "declaredCoverageSource" TEXT,
  ADD COLUMN "declaredCoverageRefId" TEXT;

ALTER TABLE "Appointment"
  ADD COLUMN "declaredCoverageSource" TEXT,
  ADD COLUMN "declaredCoverageRefId" TEXT,
  ADD COLUMN "declaredCoverageCardNumber" TEXT;
