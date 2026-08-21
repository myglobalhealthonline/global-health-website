import "server-only";

import { cookies } from "next/headers";
import { getBackendOrigin } from "@/lib/server/backend-origin";

/**
 * The patient's own Global Health billing documents (consultation/product
 * orders). Separate from `fetchAccountPayments`, which lists the Stripe
 * payment ledger and links to Stripe's hosted receipt — this is OUR fiscal
 * document, the one /print/order-invoices/:invoiceId renders.
 */
export type AccountInvoice = {
  id: string;
  invoiceNumber: string;
  documentType: "INVOICE" | "RECEIPT" | "INVOICE_RECEIPT" | "CREDIT_NOTE";
  creditNoteReason: "REFUND" | "CANCELLATION" | null;
  countryCode: string;
  generatedAt: string;
  orderNumber: string | null;
  totalCents: number;
  currencyCode: string;
  paymentStatus: string;
  description: string | null;
};

type ApiResult<T> =
  | { ok: true; data: T; message?: string }
  | { ok: false; message: string; status?: number };

async function buildCookieHeader() {
  try {
    const store = await cookies();
    return store
      .getAll()
      .map((entry) => `${entry.name}=${entry.value}`)
      .join("; ");
  } catch {
    return "";
  }
}

export async function fetchAccountInvoices(): Promise<ApiResult<{ items: AccountInvoice[] }>> {
  const apiUrl = getBackendOrigin();
  if (!apiUrl) return { ok: false, message: "Public API URL is not configured" };
  const cookieHeader = await buildCookieHeader();
  try {
    const response = await fetch(`${apiUrl}/api/account/invoices`, {
      method: "GET",
      headers: cookieHeader ? { cookie: cookieHeader } : undefined,
      cache: "no-store",
    });
    const json = (await response.json()) as {
      ok?: boolean;
      data?: { items?: AccountInvoice[] };
      message?: string;
    };
    if (!response.ok || !json.ok || !json.data?.items) {
      return {
        ok: false,
        status: response.status,
        message: json.message ?? "Unable to load invoices",
      };
    }
    return { ok: true, data: { items: json.data.items }, message: json.message };
  } catch {
    return { ok: false, message: "Backend is unavailable" };
  }
}
