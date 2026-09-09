-- Ad-click / campaign attribution captured at landing, carried onto the
-- Order at checkout: fbclid, fbp, fbc, utm_*, landingPath, marketingConsent,
-- clientIp, clientUserAgent. Additive, nullable — existing orders are
-- unaffected.
ALTER TABLE "Order" ADD COLUMN "adAttribution" JSONB;
