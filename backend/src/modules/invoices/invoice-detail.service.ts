import { prisma } from "../../db/prisma.js";
import { isCommissionCountry } from "../orders/commission.service.js";

/**
 * The payload the printable invoice page renders — the document itself, its
 * order, and the treating doctor's registration for the order's country.
 *
 * Extracted from admin-invoices.route.ts so the admin route and the public
 * `/api/public/invoices/:invoiceId` route render byte-identical documents. Two
 * copies of this shaping WOULD drift: the commission-mode decision in
 * particular has to agree with buildInvoicePdfData or the printed page and the
 * PDF disagree about what is being billed.
 *
 * Authorization is deliberately NOT here. The admin route wraps this with
 * country scope + the S-031 medical-access guard; the public route serves it
 * unguarded by design (see that file for why).
 */

export type InvoiceDetailPayload = {
  invoice: {
    id: string;
    invoiceNumber: string;
    countryCode: string;
    documentType: string;
    creditNoteReason: string | null;
    generatedAt: string;
    emailSentAt: string | null;
  };
  order: {
    id: string;
    orderNumber: string | null;
    fullName: string;
    email: string;
    phone: string | null;
    countryCode: string;
    currencyCode: string;
    totalCents: number;
    subtotalCents: number;
    shippingCents: number;
    commissionMode: boolean;
    commissionTotalCents: number | null;
    doctorPayoutTotalCents: number | null;
    paymentStatus: string;
    paidAt: string | null;
    taxIdNumber: string | null;
    consultationDate: string | null;
    items: {
      id: string;
      kind: string;
      name: string;
      quantity: number;
      unitPriceCents: number;
      lineTotalCents: number;
      commissionCents: number | null;
    }[];
  };
  doctor: {
    fullName: string;
    registrationNumber: string | null;
    chamberEntity: string | null;
  } | null;
  /** PatientProfile id for the order's email, or null for a guest order.
   *  The admin route needs it to log the PHI read; the public route ignores it. */
  patientProfileId: string | null;
};

/** Null when no invoice carries this id. */
export async function buildInvoiceDetailPayload(
  invoiceId: string,
): Promise<InvoiceDetailPayload | null> {
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: {
      order: {
        include: {
          items: {
            select: {
              id: true,
              kind: true,
              name: true,
              quantity: true,
              unitPriceCents: true,
              lineTotalCents: true,
              commissionCents: true,
              doctorId: true,
              appointmentId: true,
            },
          },
        },
      },
    },
  });

  if (!invoice) return null;

  // Find the first consultation item that has a doctor assigned.
  const consultItem = invoice.order.items.find(
    (i) =>
      (i.kind === "GENERAL_CONSULTATION" || i.kind === "SPECIALIST_CONSULTATION") && i.doctorId,
  );

  let doctor: InvoiceDetailPayload["doctor"] = null;

  if (consultItem?.doctorId) {
    // Fetch doctor name + all their country registrations in one query.
    const doctorRow = await prisma.doctor.findUnique({
      where: { id: consultItem.doctorId },
      select: {
        fullName: true,
        country: { select: { code: true } },
        additionalCountries: {
          select: {
            registrationNumber: true,
            chamberEntity: true,
            country: { select: { code: true } },
          },
        },
      },
    });

    if (doctorRow) {
      const orderCountry = invoice.order.countryCode.toLowerCase();

      // Check primary country first, then additional countries.
      const allRegistrations = [
        {
          code: doctorRow.country.code.toLowerCase(),
          registrationNumber: null as string | null,
          chamberEntity: null as string | null,
        },
        ...doctorRow.additionalCountries.map((dc) => ({
          code: dc.country.code.toLowerCase(),
          registrationNumber: dc.registrationNumber,
          chamberEntity: dc.chamberEntity,
        })),
      ];

      const matchedReg = allRegistrations.find((r) => r.code === orderCountry);

      let regNumber: string | null = matchedReg?.registrationNumber ?? null;
      let chamberEntity: string | null = matchedReg?.chamberEntity ?? null;

      // Primary country: registration lives in DoctorCountry (the M:N row).
      if (!regNumber) {
        const dc = await prisma.doctorCountry.findFirst({
          where: {
            doctorId: consultItem.doctorId,
            country: { code: { equals: orderCountry, mode: "insensitive" } },
          },
          select: { registrationNumber: true, chamberEntity: true },
        });
        regNumber = dc?.registrationNumber ?? null;
        chamberEntity = dc?.chamberEntity ?? null;
      }

      doctor = {
        fullName: doctorRow.fullName,
        registrationNumber: regNumber,
        chamberEntity,
      };
    }
  }

  // PatientProfile — taxpayer ID printed on the document.
  const profile = await prisma.patientProfile.findUnique({
    where: { email: invoice.order.email.toLowerCase() },
    select: { id: true, taxIdNumber: true },
  });

  // Consultation date from the appointment.
  const consultApptId = consultItem?.appointmentId ?? null;
  let consultationDate: string | null = null;
  if (consultApptId) {
    const appt = await prisma.appointment.findUnique({
      where: { id: consultApptId },
      select: { scheduledAt: true },
    });
    consultationDate = appt?.scheduledAt?.toISOString() ?? null;
  }

  return {
    invoice: {
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      countryCode: invoice.countryCode,
      documentType: invoice.documentType,
      creditNoteReason: invoice.creditNoteReason,
      generatedAt: invoice.generatedAt.toISOString(),
      emailSentAt: invoice.emailSentAt?.toISOString() ?? null,
    },
    order: {
      id: invoice.order.id,
      orderNumber: invoice.order.orderNumber,
      fullName: invoice.order.fullName,
      email: invoice.order.email,
      phone: invoice.order.phone,
      countryCode: invoice.order.countryCode,
      currencyCode: invoice.order.currencyCode,
      totalCents: invoice.order.totalCents,
      subtotalCents: invoice.order.subtotalCents,
      shippingCents: invoice.order.shippingCents,
      // Commission markets: the print page renders a single commission line
      // instead of the basket, mirroring the PDF. The DECISION is made here
      // rather than in the page so both renderers agree — same rule as
      // buildInvoicePdfData: a commission market with no frozen snapshot
      // (pre-feature order) falls back to full-price rendering.
      commissionMode:
        invoice.order.commissionTotalCents != null &&
        (await isCommissionCountry(invoice.order.countryCode)),
      commissionTotalCents: invoice.order.commissionTotalCents,
      doctorPayoutTotalCents: invoice.order.doctorPayoutTotalCents,
      paymentStatus: invoice.order.paymentStatus,
      paidAt: invoice.order.paidAt?.toISOString() ?? null,
      taxIdNumber: profile?.taxIdNumber ?? null,
      consultationDate,
      items: invoice.order.items.map((i) => ({
        id: i.id,
        kind: i.kind,
        name: i.name,
        quantity: i.quantity,
        unitPriceCents: i.unitPriceCents,
        lineTotalCents: i.lineTotalCents,
        // Drives the per-service commission lines on the print page.
        commissionCents: i.commissionCents,
      })),
    },
    doctor,
    patientProfileId: profile?.id ?? null,
  };
}
