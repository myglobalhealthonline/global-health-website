import { prisma } from "../../db/prisma.js";

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
    select: { taxIdNumber: true },
  });
  const nif = profile?.taxIdNumber?.trim() || "";

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
