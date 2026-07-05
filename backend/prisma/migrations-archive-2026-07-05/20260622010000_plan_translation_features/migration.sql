-- Admin-editable public-card "Includes" bullets per locale (§12).
-- Additive, non-null with empty-array default → existing rows unaffected.
ALTER TABLE "PlanTranslation" ADD COLUMN "features" TEXT[] NOT NULL DEFAULT '{}';
