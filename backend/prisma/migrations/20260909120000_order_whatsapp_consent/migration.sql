-- Order-level WhatsApp consent for PRODUCT orders.
--
-- Health-test kit orders have no booking form, so every OrderItem on them
-- carries `patientWhatsappConsent = false` (cart.route.ts stamps it from the
-- consultation patient object, which product lines never send). The consent
-- gate in `sendWhatsAppText` fails closed on false, so the buyer could never be
-- sent their own order confirmation over WhatsApp.
--
-- The buyer IS the patient on a product order and gives their own phone at
-- checkout, so consent is captured once, at order level, as a default-ON
-- opt-out checkbox on the checkout shipping panel.
--
-- Default true so every historical row reads as "consented" — those orders were
-- placed under the same terms and the column only ever gates transactional
-- order messages to the number the buyer typed themselves.
--
-- Idempotent DDL: safe to re-run against the live Railway DB (see CLAUDE.md /
-- db-migration-workflow — `migrate deploy`, never `migrate dev`).

ALTER TABLE "Order"
  ADD COLUMN IF NOT EXISTS "whatsappConsent" BOOLEAN NOT NULL DEFAULT true;
