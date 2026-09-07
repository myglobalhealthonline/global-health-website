import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { getBackendOrigin } from "@/lib/server/backend-origin";
import { buildPublicMetadata } from "@/lib/seo/page-seo";
import { InvoiceDocument, type InvoiceDetail } from "../../_components/invoice-document";
import { InvoicePhiReasonGate } from "../../_components/invoice-phi-reason-gate";

export const dynamic = "force-dynamic";

export const metadata: Metadata = buildPublicMetadata({
  path: "/print/order-invoices",
  title: "Printable invoice or receipt",
  description: "Secure printable billing document from Global Health.",
  kind: "page",
  noindex: true,
});

type Params = { invoiceId: string };
/** `t` is the short capability in links emailed today; `token` is the long
 *  signed JWT older invoice emails still carry. Both are forwarded as-is. */
type SearchParams = { t?: string; token?: string; reasonError?: string };

/**
 * Reads the public billing endpoint, NOT /api/admin/invoices/:id. This page is
 * reached from the invoice link emailed to the patient, so it has to render for
 * whoever holds that link — the admin route 403s a doctor (which this page then
 * turned into a 404) and bounces the patient to /account, which is exactly the
 * bug this fixes.
 */
async function fetchPublicInvoiceDetail(
  invoiceId: string,
  token: string,
): Promise<InvoiceDetail | null> {
  const backend = getBackendOrigin();
  if (!backend) return null;
  try {
    const url = new URL(`${backend}/api/public/invoices/${encodeURIComponent(invoiceId)}`);
    url.searchParams.set("token", token);
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;
    const json = (await res.json()) as { ok?: boolean; data?: InvoiceDetail };
    if (!json.ok || !json.data) return null;
    return json.data;
  } catch {
    return null;
  }
}

/**
 * Result of the signed-in read. `phi-reason-required` is its own outcome, not a
 * failure: the admin detail route runs the S-002 break-glass guard, so a plain
 * ADMIN with no `gh_phi_reason` cookie is denied 403
 * ADMIN_BREAK_GLASS_REASON_REQUIRED. Collapsing that into "no document" is what
 * turned the admin portal's View button into a 404.
 */
type AuthenticatedRead =
  | { kind: "data"; data: InvoiceDetail; source: "account" | "admin" }
  | { kind: "phi-reason-required" }
  | null;

async function fetchAuthenticatedInvoiceDetail(invoiceId: string): Promise<AuthenticatedRead> {
  const backend = getBackendOrigin();
  if (!backend) return null;
  const requestHeaders = await headers();
  const cookie = requestHeaders.get("cookie") ?? "";
  if (!cookie) return null;

  let phiReasonRequired = false;

  for (const source of ["account", "admin"] as const) {
    const res = await fetch(`${backend}/api/${source}/invoices/${encodeURIComponent(invoiceId)}`, {
      cache: "no-store",
      headers: { cookie },
    }).catch(() => null);
    if (!res) continue;

    if (res.status === 403) {
      const denial = (await res.json().catch(() => null)) as {
        details?: { reasonCode?: string };
      } | null;
      if (denial?.details?.reasonCode === "ADMIN_BREAK_GLASS_REASON_REQUIRED") {
        phiReasonRequired = true;
      }
      continue;
    }

    if (!res.ok) continue;
    const json = (await res.json()) as { ok?: boolean; data?: InvoiceDetail };
    if (json.ok && json.data) {
      return { kind: "data", data: json.data, source };
    }
  }

  return phiReasonRequired ? { kind: "phi-reason-required" } : null;
}

export default async function PrintOrderInvoicePage({
  params,
  searchParams,
}: {
  params: Promise<Params>;
  searchParams: Promise<SearchParams>;
}) {
  const { invoiceId } = await params;
  const { t, token, reasonError } = await searchParams;
  const rawToken = typeof t === "string" && t.trim().length > 0 ? t : token;
  const publicToken =
    typeof rawToken === "string" && rawToken.trim().length > 0 ? rawToken.trim() : null;

  const publicData = publicToken ? await fetchPublicInvoiceDetail(invoiceId, publicToken) : null;
  const authed = publicData ? null : await fetchAuthenticatedInvoiceDetail(invoiceId);

  if (authed?.kind === "phi-reason-required") {
    return (
      <InvoicePhiReasonGate
        returnTo={`/print/order-invoices/${encodeURIComponent(invoiceId)}`}
        showError={reasonError === "1"}
      />
    );
  }

  const data = publicData ?? (authed?.kind === "data" ? authed.data : null);
  if (!data) notFound();

  const downloadHref = publicToken
    ? `/api/public/invoices/${encodeURIComponent(invoiceId)}/pdf?token=${encodeURIComponent(publicToken)}`
    : authed?.kind === "data" && authed.source === "admin"
      ? `/api/admin/invoices/${encodeURIComponent(invoiceId)}/pdf`
      : `/api/account/invoices/${encodeURIComponent(invoiceId)}/pdf`;

  return (
    <InvoiceDocument
      data={data}
      downloadHref={downloadHref}
    />
  );
}
