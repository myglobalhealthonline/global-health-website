import { prisma } from "../../db/prisma.js";

/**
 * Corporate consultation documents.
 *
 * The platform does NOT issue the company's own subscription Invoice /
 * Receipt / Credit-note: a corporate company is billed offline under a signed
 * agreement and no money moves through the platform. What the admin corporate
 * tab surfaces is the company's EMPLOYEES' consultation documents — the
 * ordinary Invoice rows from orders the employees booked.
 */

export type CorporateInvoiceDocument = {
  id: string;
  invoiceNumber: string;
  countryCode: string;
  documentType: "INVOICE" | "RECEIPT" | "INVOICE_RECEIPT" | "CREDIT_NOTE";
  generatedAt: string;
  emailSentAt: string | null;
  emailSentTo: string | null;
  orderId: string;
  orderNumber: string | null;
  fullName: string;
  email: string;
  totalCents: number;
  currencyCode: string;
};

type InvoiceWithOrder = {
  id: string;
  invoiceNumber: string;
  countryCode: string;
  documentType: CorporateInvoiceDocument["documentType"];
  generatedAt: Date;
  emailSentAt: Date | null;
  emailSentTo: string | null;
  orderId: string;
  order: {
    orderNumber: string | null;
    fullName: string;
    email: string;
    totalCents: number;
    currencyCode: string;
  };
};

function toDocument(inv: InvoiceWithOrder): CorporateInvoiceDocument {
  return {
    id: inv.id,
    invoiceNumber: inv.invoiceNumber,
    countryCode: inv.countryCode,
    documentType: inv.documentType,
    generatedAt: inv.generatedAt.toISOString(),
    emailSentAt: inv.emailSentAt?.toISOString() ?? null,
    emailSentTo: inv.emailSentTo,
    orderId: inv.orderId,
    orderNumber: inv.order.orderNumber,
    fullName: inv.order.fullName,
    email: inv.order.email,
    totalCents: inv.order.totalCents,
    currencyCode: inv.order.currencyCode,
  };
}

const ORDER_SELECT = {
  orderNumber: true,
  fullName: true,
  email: true,
  totalCents: true,
  currencyCode: true,
} as const;

/**
 * The company's employees' own consultation invoices, matched by employee
 * userId / (case-insensitive) email.
 */
export async function listCorporateInvoiceDocuments(companyId: string): Promise<{
  consultations: CorporateInvoiceDocument[];
}> {
  const employees = await prisma.corporateEmployee.findMany({
    where: { companyId },
    select: { userId: true, email: true },
  });
  const userIds = employees.map((e) => e.userId).filter((v): v is string => Boolean(v));
  const emails = Array.from(
    new Set(employees.map((e) => e.email.toLowerCase()).filter(Boolean)),
  );
  if (!userIds.length && !emails.length) return { consultations: [] };

  const emailOr = emails.map((email) => ({
    order: { email: { equals: email, mode: "insensitive" as const } },
  }));
  const consultationInvoices = await prisma.invoice.findMany({
    where: {
      // Legacy synthetic billing orders (the retired subscription-invoice
      // generator) are never consultation documents.
      order: { corporateCompanyId: null },
      OR: [...(userIds.length ? [{ order: { userId: { in: userIds } } }] : []), ...emailOr],
    },
    orderBy: { generatedAt: "desc" },
    select: {
      id: true,
      invoiceNumber: true,
      countryCode: true,
      documentType: true,
      generatedAt: true,
      emailSentAt: true,
      emailSentTo: true,
      orderId: true,
      order: { select: ORDER_SELECT },
    },
    take: 200,
  });

  return { consultations: consultationInvoices.map(toDocument) };
}
