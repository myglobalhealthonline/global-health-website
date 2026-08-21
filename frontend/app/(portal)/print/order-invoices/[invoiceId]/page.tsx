import type { Metadata } from "next";
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

/**
 * Reads the public billing endpoint, NOT /api/admin/invoices/:id. This page is
 * reached from the invoice link emailed to the patient, so it has to render for
 * whoever holds that link — the admin route 403s a doctor (which this page then
 * turned into a 404) and bounces the patient to /account, which is exactly the
 * bug this fixes.
 */
async function fetchInvoiceDetail(invoiceId: string): Promise<InvoiceDetail | null> {
  const backend = getBackendOrigin();
  if (!backend) return null;
  try {
    const res = await fetch(`${backend}/api/public/invoices/${encodeURIComponent(invoiceId)}`, {
      cache: "no-store",
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { ok?: boolean; data?: InvoiceDetail };
    if (!json.ok || !json.data) return null;
    return json.data;
  } catch {
    return null;
  }
}

export default async function PrintOrderInvoicePage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { invoiceId } = await params;
  const data = await fetchInvoiceDetail(invoiceId);
  if (!data) notFound();

  return (
    <InvoiceDocument
      data={data}
      downloadHref={`/api/public/invoices/${encodeURIComponent(invoiceId)}/pdf`}
    />
  );
}
