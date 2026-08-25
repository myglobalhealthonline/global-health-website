import { env } from "../../config/env.js";

/**
 * Low-level InvoiceExpress REST client for Portugal legal-invoice issuance.
 *
 * Three calls, matching the InvoiceExpress API, all authenticated with the
 * `api_key` query param on the account subdomain
 * (https://{account}.app.invoicexpress.com):
 *   1. createInvoiceReceipt — POST /invoice_receipts.json                    (draft)
 *   2. finalizeInvoice      — PUT  /{docPath}/{id}/change-state.json  (→ settled)
 *   3. emailInvoiceReceipt  — POST /{docPath}/{id}/email-document.json
 *
 * Every path is document-type scoped (`invoice_receipts` for a Fatura-Recibo,
 * `invoices` for a plain Fatura), and so is the JSON root key on both request
 * and response. Until 2026-08-25 the create call posted `{invoice: {type:
 * "InvoiceReceipt", ...}}` to the generic `/invoices.json`; InvoiceExpress
 * stopped honouring that `type` field around 2026-07-17 and started returning a
 * plain draft Invoice under an `invoice` root, so the `invoice_receipt.id` read
 * threw, no document was ever finalized or emailed, and every PT order since
 * left an orphan draft behind. Hence: type-scoped paths, and a response parse
 * that accepts whichever root key comes back and reports the type it got.
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

/**
 * The two document types this client issues. `InvoiceReceipt` (Fatura-Recibo)
 * is what a paid consultation gets; `Invoice` only appears when InvoiceExpress
 * answers a create with a plain Fatura, which we then still finalize and email
 * rather than abandon as a draft.
 */
export type IeDocumentType = "InvoiceReceipt" | "Invoice";

/** URL segment + JSON root key for a document type — they always agree. */
function docPath(type: IeDocumentType): "invoice_receipts" | "invoices" {
  return type === "InvoiceReceipt" ? "invoice_receipts" : "invoices";
}

function docRootKey(type: IeDocumentType): "invoice_receipt" | "invoice" {
  return type === "InvoiceReceipt" ? "invoice_receipt" : "invoice";
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

export interface IeListedDocument {
  id: number;
  type: string;
  status: string;
  /** dd/mm/yyyy, as InvoiceExpress renders it. */
  date: string;
  sequence_number: string;
  total: number;
  client?: { name?: string; fiscal_id?: string };
}

/**
 * One page of the account's documents, newest first. Read-only — the cleanup
 * script uses it to find orphan drafts.
 */
export async function listDocuments(
  page: number,
  perPage = 30,
): Promise<IeListedDocument[]> {
  const url = `${ieUrl("/invoices.json")}&page=${page}&per_page=${perPage}`;
  const res = await fetch(url, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  const text = await res.text().catch(() => "");
  if (!res.ok) {
    throw new Error(
      `InvoiceExpress GET ${redact(url)} → ${res.status}${text.trim() ? `: ${text.trim().slice(0, 500)}` : ""}`,
    );
  }
  const json = JSON.parse(text) as { invoices?: IeListedDocument[] };
  return json.invoices ?? [];
}

export interface IeDocumentDetail {
  id: number;
  type: string;
  status: string;
  /** dd/mm/yyyy. */
  date: string;
  /** The fiscal reference, e.g. "202/Globalhealth". */
  sequence_number: string;
  /** InvoiceExpress's own shareable link to the document. */
  permalink?: string;
  total: number;
  client?: { name?: string; fiscal_id?: string };
}

/** One document, by id. Read-only. */
export async function getDocument(
  id: number,
  type: IeDocumentType,
): Promise<IeDocumentDetail> {
  const url = ieUrl(`/${docPath(type)}/${id}.json`);
  const res = await fetch(url, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  const text = await res.text().catch(() => "");
  if (!res.ok) {
    throw new Error(
      `InvoiceExpress GET ${redact(url)} → ${res.status}${text.trim() ? `: ${text.trim().slice(0, 500)}` : ""}`,
    );
  }
  const json = JSON.parse(text) as {
    invoice_receipt?: IeDocumentDetail;
    invoice?: IeDocumentDetail;
  };
  const doc = json.invoice_receipt ?? json.invoice;
  if (!doc) throw new Error(`InvoiceExpress GET ${redact(url)} returned no document`);
  return doc;
}

/**
 * Download the document's PDF.
 *
 * InvoiceExpress renders PDFs asynchronously: `/api/pdf/{id}.json` answers 202
 * with an empty body while the render is queued and 200 with a signed S3 URL
 * once it is ready. So this polls, then fetches the bytes from that URL — which
 * expires, hence "download now and store it" rather than "keep the link".
 */
export async function fetchDocumentPdf(
  id: number,
  opts: { attempts?: number; delayMs?: number } = {},
): Promise<Buffer> {
  const attempts = opts.attempts ?? 6;
  const delayMs = opts.delayMs ?? 1_500;
  const url = ieUrl(`/api/pdf/${id}.json`);

  let pdfUrl: string | undefined;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    const text = await res.text().catch(() => "");
    if (res.status === 200) {
      const json = JSON.parse(text) as { output?: { pdfUrl?: string } };
      pdfUrl = json.output?.pdfUrl;
      if (pdfUrl) break;
    } else if (res.status !== 202) {
      throw new Error(
        `InvoiceExpress GET ${redact(url)} → ${res.status}${text.trim() ? `: ${text.trim().slice(0, 300)}` : ""}`,
      );
    }
    if (attempt < attempts) await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
  if (!pdfUrl) {
    throw new Error(`InvoiceExpress PDF for ${id} was still rendering after ${attempts} attempts`);
  }

  // The signed S3 URL carries its own credentials — no api_key, nothing to redact.
  const pdf = await fetch(pdfUrl, { signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!pdf.ok) {
    throw new Error(`InvoiceExpress PDF download for ${id} → ${pdf.status}`);
  }
  return Buffer.from(await pdf.arrayBuffer());
}

export interface IeInvoiceItem {
  name: string;
  description: string;
  unit_price: number;
  quantity: number;
  tax: { name: string };
}

export interface IeInvoiceBody {
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
}

export interface IeCreatedDocument {
  id: number;
  /** What InvoiceExpress actually created — drives every follow-up path. */
  type: IeDocumentType;
}

/**
 * Read the created document out of a create response, whichever root key
 * InvoiceExpress used. Exported for the unit test: this parse is the exact
 * thing that silently broke PT invoicing for five weeks.
 */
export function parseCreatedDocument(json: unknown): IeCreatedDocument {
  const body = (json ?? {}) as {
    invoice_receipt?: { id?: number; type?: string };
    invoice?: { id?: number; type?: string };
  };
  const doc = body.invoice_receipt ?? body.invoice;
  const id = doc?.id;
  if (typeof id !== "number") {
    throw new Error(
      `InvoiceExpress create returned no document id (got ${JSON.stringify(json).slice(0, 200)})`,
    );
  }
  // Trust the document's own `type` when present; otherwise infer it from the
  // root key that carried it.
  const type: IeDocumentType =
    doc?.type === "Invoice" || (doc?.type === undefined && body.invoice_receipt === undefined)
      ? "Invoice"
      : "InvoiceReceipt";
  return { id, type };
}

/** Create a DRAFT Fatura-Recibo. Returns its id and the type actually created. */
export async function createInvoiceReceipt(body: IeInvoiceBody): Promise<IeCreatedDocument> {
  const json = await ieRequest("POST", "/invoice_receipts.json", { invoice_receipt: body });
  return parseCreatedDocument(json);
}

/** Transition draft → finalized (issues the legal document, assigns a number). */
export async function finalizeInvoice(id: number, type: IeDocumentType): Promise<void> {
  await ieRequest("PUT", `/${docPath(type)}/${id}/change-state.json`, {
    [docRootKey(type)]: { state: "finalized" },
  });
}

/**
 * Delete a DRAFT document. Drafts carry no fiscal number, so this is a plain
 * cleanup — it is NOT a way to undo a finalized document (that needs a credit
 * note). Used by scripts/pt-invoicexpress-cleanup-drafts.ts.
 */
export async function deleteDraftDocument(id: number, type: IeDocumentType): Promise<void> {
  await ieRequest("PUT", `/${docPath(type)}/${id}/change-state.json`, {
    [docRootKey(type)]: { state: "deleted" },
  });
}

/** Email the finalized document's PDF to the patient. */
export async function emailInvoiceReceipt(
  id: number,
  type: IeDocumentType,
  opts: { email: string; subject: string; body: string },
): Promise<void> {
  await ieRequest("POST", `/${docPath(type)}/${id}/email-document.json`, {
    message: {
      client: { email: opts.email, save: "0" },
      subject: opts.subject,
      body: opts.body,
      logo: "0",
    },
  });
}
