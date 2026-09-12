import { prisma } from "../../db/prisma.js";
import { decryptPhi } from "../../lib/crypto/phi-crypto.js";
import { resolvePatientCountryTaxId } from "../patient-profile/patient-country-tax-ids.js";

/**
 * Decrypt a PHI field, treating an undecryptable value as absent — a missing key
 * or corrupt envelope must not abort checkout. Mirrors the helper in
 * pt-invoicexpress.service.ts; kept local so this module stays importable from
 * the checkout path without pulling the issuance service in.
 */
function safeDecryptPhi(value: string | null | undefined): string | null {
  try {
    return decryptPhi(value ?? null);
  } catch {
    return null;
  }
}

/**
 * Structural shape of Stripe's `invoice_creation` Checkout param (the subset we
 * set). Typed locally to avoid the stripe-node namespace-type quirk; it matches
 * `Stripe.Checkout.SessionCreateParams.InvoiceCreation` structurally.
 */
export interface StripeInvoiceCreation {
  enabled: true;
  invoice_data?: {
    custom_fields?: Array<{ name: string; value: string }>;
    metadata?: Record<string, string>;
  };
}

/**
 * Portugal: InvoiceExpress's native Stripe integration auto-issues the legal
 * invoice from the Stripe (PT) account when a payment completes. For the
 * invoice to carry every field it needs, the Stripe-side objects must expose:
 *   - the fiscal number (NIF), from the patient's stored taxIdNumber, and
 *   - the service name.
 *
 * Stripe doesn't reliably accept a consumer NIF as a Customer Tax ID (that
 * field is for VAT numbers), so we surface the NIF + service on the auto-created
 * Stripe INVOICE via custom fields AND metadata — the two places an integration
 * can map a fiscal_id / description from. InvoiceExpress must be pointed at
 * whichever it reads (see docs/stripe-multi-account-and-portugal-invoice.md).
 *
 * Returns `undefined` for non-PT countries (they don't use InvoiceExpress) so
 * callers can fall back to Stripe's default invoice handling.
 */
export async function buildPtStripeInvoiceData(
  countryCode: string | null | undefined,
  buyerEmail: string,
  serviceName: string,
): Promise<StripeInvoiceCreation | undefined> {
  if (countryCode?.trim().toLowerCase() !== "pt") return undefined;

  const profile = await prisma.patientProfile.findUnique({
    where: { email: buyerEmail.toLowerCase() },
    select: { id: true, taxIdNumber: true },
  });
  // The PT row first — for a patient who also consults in another market the
  // shared column may hold that country's number, and a Brazilian CPF printed
  // as "NIF" on a Portuguese invoice is a legally wrong document.
  //
  // Then DECRYPTED, not raw: `taxIdNumber` is PHI-encrypted at rest, so the
  // column value is a `phi:v1:` envelope. Passing it through put the ciphertext
  // itself into the Stripe custom field — the same mistake resolveFiscalId's
  // doc comment records for InvoiceExpress.
  const nif =
    (await resolvePatientCountryTaxId(profile?.id ?? null, "PT")) ??
    safeDecryptPhi(profile?.taxIdNumber) ??
    "";

  const customFields: Array<{ name: string; value: string }> = [];
  // Stripe caps custom-field name/value at 30 chars each.
  if (nif) customFields.push({ name: "NIF", value: nif.slice(0, 30) });
  if (serviceName) customFields.push({ name: "Servico", value: serviceName.slice(0, 30) });

  return {
    enabled: true,
    invoice_data: {
      ...(customFields.length ? { custom_fields: customFields } : {}),
      metadata: {
        country: "pt",
        nif,
        service_name: serviceName,
      },
    },
  };
}
