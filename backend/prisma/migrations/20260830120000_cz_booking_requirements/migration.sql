-- Czech booking intake rules.
--
-- Mandatory on the Czech booking form: name, email, phone, date of birth,
-- address, and a passport / ID card number. The identity-document rule itself
-- lives in code (`identityDocumentError` in booking.schema.ts) because it
-- reads one of two columns; the rest are BookingSetting flags, set here so the
-- live row matches the form regardless of what an operator toggled before.
--
-- `requireNationalId` is explicitly turned OFF: the Czech national ID is the
-- rodné číslo, which stays optional — expats treated in Czechia have none and
-- must still be able to book.
UPDATE "BookingSetting" bs
SET "requirePhone" = true,
    "requireDateOfBirth" = true,
    "requireAddress" = true,
    "requireNationalId" = false,
    "updatedAt" = NOW()
FROM "Country" c
WHERE c."id" = bs."countryId"
  AND lower(c."code") = 'cz';
