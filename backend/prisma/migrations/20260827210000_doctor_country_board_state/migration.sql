-- Doctor's CRM-issuing Brazilian state (UF) — Memed's board_state.
--
-- Discovered live: registering Dr. Renato with Memed failed with
-- "board_state deve ser uma sigla válida de um estado do Brasil" because we
-- were sending the COUNTRY code ("BR") where Memed expects the two-letter
-- STATE the CRM was issued in ("SP", "RJ", ...). No field existed to hold
-- that value at all.

ALTER TABLE "DoctorCountry" ADD COLUMN IF NOT EXISTS "boardState" TEXT;
