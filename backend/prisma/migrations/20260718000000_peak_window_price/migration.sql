-- Per-window peak price. Null → the config's shared peakPriceCents applies.
ALTER TABLE "ServicePeakWindow" ADD COLUMN "priceCents" INTEGER;
