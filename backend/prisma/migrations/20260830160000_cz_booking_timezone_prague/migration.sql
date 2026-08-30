-- Czechia's booking timezone was "Europe/Vienna". Vienna and Prague share an
-- offset, so every time was correct, but the label derived from the zone named
-- the wrong country: Czech bookings read "14:00 (Austria)" in notifications and
-- across admin. Point it at the country's own zone.
--
-- Scoped to the wrong value so a country deliberately re-pointed later is not
-- clobbered by a re-run.
UPDATE "BookingSetting" bs
SET "timezone" = 'Europe/Prague',
    "updatedAt" = NOW()
FROM "Country" c
WHERE c."id" = bs."countryId"
  AND lower(c."code") = 'cz'
  AND bs."timezone" = 'Europe/Vienna';
