import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { getBackendOrigin } from "@/lib/server/backend-origin";
import { buildPublicMetadata } from "@/lib/seo/page-seo";
import { InvoiceDocument, type InvoiceDetail } from "../../_components/invoice-document";

export const dynamic = "force-dynamic";

export const metadata: Metadata = buildPublicMetadata({
  path: "/print/order-invoices",
  title: "Printable invoice or receipt",
  description: "Secure printable billing document from Global Health.",
  kind: "page",
  noindex: true,
});

type Params = { invoiceId: string };
type SearchParams = { token?: string };

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

async function fetchAuthenticatedInvoiceDetail(
  invoiceId: string,
): Promise<{ data: InvoiceDetail; source: "account" | "admin" } | null> {
  const backend = getBackendOrigin();
  if (!backend) return null;
  const requestHeaders = await headers();
  const cookie = requestHeaders.get("cookie") ?? "";
  if (!cookie) return null;

  for (const source of ["account", "admin"] as const) {
    const res = await fetch(`${backend}/api/${source}/invoices/${encodeURIComponent(invoiceId)}`, {
      cache: "no-store",
      headers: { cookie },
    }).catch(() => null);
    if (!res?.ok) continue;
    const json = (await res.json()) as { ok?: boolean; data?: InvoiceDetail };
    if (json.ok && json.data) {
      return { data: json.data, source };
    }
  }
  return null;
}

export default async function PrintOrderInvoicePage({
  params,
  searchParams,
}: {
  params: Promise<Params>;
  searchParams: Promise<SearchParams>;
}) {
  const { invoiceId } = await params;
  const { token } = await searchParams;
  const publicToken = typeof token === "string" && token.trim().length > 0 ? token.trim() : null;

  const publicData = publicToken ? await fetchPublicInvoiceDetail(invoiceId, publicToken) : null;
  const authed = publicData ? null : await fetchAuthenticatedInvoiceDetail(invoiceId);
  const data = publicData ?? authed?.data ?? null;
  if (!data) notFound();

  const downloadHref = publicToken
    ? `/api/public/invoices/${encodeURIComponent(invoiceId)}/pdf?token=${encodeURIComponent(publicToken)}`
    : authed?.source === "admin"
      ? `/api/admin/invoices/${encodeURIComponent(invoiceId)}/pdf`
      : `/api/account/invoices/${encodeURIComponent(invoiceId)}/pdf`;

  return (
    <InvoiceDocument
      data={data}
      downloadHref={downloadHref}
    />
  );
}
