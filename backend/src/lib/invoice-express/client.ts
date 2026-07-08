import { env } from "../../config/env.js";

/**
 * Low-level InvoiceExpress REST client for Portugal legal-invoice issuance.
 *
 * Three calls, matching the InvoiceExpress API, all authenticated with the
 * `api_key` query param on the account subdomain
 * (https://{account}.app.invoicexpress.com):
 *   1. createInvoiceReceipt — POST /invoices.json            (draft)
 *   2. finalizeInvoice      — PUT  /invoices/{id}/change-state.json  (→ settled)
 *   3. emailInvoiceReceipt  — POST /invoice_receipts/{id}/email-document.json
 *
 * Native fetch + AbortSignal.timeout, mirroring lib/whatsapp/wasender.ts. On a
 * non-2xx response these throw with a truncated body so the orchestrator can
 * log + ops-alert; the orchestrator (pt-invoicexpress.service.ts) owns the
 * gating (PT-only, live-key, idempotency) and never lets a failure block the
 * paid order.
 */

const TIMEOUT_MS = 20_000;

/** Both env vars must be present for the issuer to fire. */
export function isInvoiceExpressConfigured(): boolean {
  return Boolean(env.INVOICE_EXPRESS_API_KEY?.trim() && env.INVOICE_EXPRESS_ACCOUNT?.trim());
}

function ieBaseUrl(): string {
  const account = env.INVOICE_EXPRESS_ACCOUNT?.trim() ?? "";
  return `https://${account}.app.invoicexpress.com`;
}

function ieUrl(path: string): string {
  const key = env.INVOICE_EXPRESS_API_KEY?.trim() ?? "";
  return `${ieBaseUrl()}${path}?api_key=${encodeURIComponent(key)}`;
}

/** Never leak the api_key from a URL into logs. */
function redact(url: string): string {
  return url.replace(/api_key=[^&]*/i, "api_key=***");
}

async function ieRequest(
  method: "POST" | "PUT",
  path: string,
  body: unknown,
): Promise<unknown> {
  const url = ieUrl(path);
  const res = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });

  const text = await res.text().catch(() => "");
  if (!res.ok) {
    const detail = text.trim().slice(0, 500);
    throw new Error(`InvoiceExpress ${method} ${redact(url)} → ${res.status}${detail ? `: ${detail}` : ""}`);
  }
  if (!text.trim()) return {};
  try {
    return JSON.parse(text);
  } catch {
    return {};
  }
}

export interface IeInvoiceItem {
  name: string;
  description: string;
  unit_price: number;
  quantity: number;
  tax: { name: string };
}

export interface IeInvoicePayload {
  invoice: {
    type: "InvoiceReceipt";
    date: string;
    due_date: string;
    tax_exemption: string;
    client: {
      name: string;
      code: string;
      fiscal_id: string;
      address: string;
      postal_code: string;
      city: string;
    };
    items: IeInvoiceItem[];
  };
}

/** Create a DRAFT InvoiceReceipt. Returns its numeric id. */
export async function createInvoiceReceipt(payload: IeInvoicePayload): Promise<{ id: number }> {
  const json = (await ieRequest("POST", "/invoices.json", payload)) as {
    invoice_receipt?: { id?: number };
  };
  const id = json.invoice_receipt?.id;
  if (typeof id !== "number") {
    throw new Error(`InvoiceExpress create returned no invoice_receipt.id (got ${JSON.stringify(json).slice(0, 200)})`);
  }
  return { id };
}

/** Transition draft → finalized (issues the legal document, assigns a number). */
export async function finalizeInvoice(id: number): Promise<void> {
  await ieRequest("PUT", `/invoices/${id}/change-state.json`, {
    invoice: { state: "finalized" },
  });
}

/** Email the finalized InvoiceReceipt PDF to the patient. */
export async function emailInvoiceReceipt(
  id: number,
  opts: { email: string; subject: string; body: string },
): Promise<void> {
  await ieRequest("POST", `/invoice_receipts/${id}/email-document.json`, {
    message: {
      client: { email: opts.email, save: "0" },
      subject: opts.subject,
      body: opts.body,
      logo: "0",
    },
  });
}
