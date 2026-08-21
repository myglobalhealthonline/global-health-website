import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getBackendOrigin } from "@/lib/server/backend-origin";
import { buildPublicMetadata } from "@/lib/seo/page-seo";
import { InvoiceDocument, type InvoiceDetail } from "../../_components/invoice-document";

export const dynamic = "force-dynamic";

export const metadata: Metadata = buildPublicMetadata({
  path: "/print/subscription-invoices",
  title: "Printable membership invoice",
  description: "Secure printable billing document from Global Health.",
  kind: "page",
  noindex: true,
});

type Params = { id: string };

/**
 * Membership charges rendered as OUR document rather than Stripe's hosted
 * invoice page, so a patient sees one consistent document from us in their own
 * market's language.
 *
 * Unlike the order invoice this page is session-scoped, not link-shareable:
 * nothing of ours emails a membership invoice link, so there is no reason to
 * expose one. The backend scopes the lookup to the caller's own subscription.
 */
async function fetchSubscriptionInvoice(id: string): Promise<InvoiceDetail | null> {
  const backend = getBackendOrigin();
  if (!backend) return null;
  const store = await cookies();
  const cookieHeader = store
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join("; ");
  try {
    const res = await fetch(
      `${backend}/api/account/subscription-invoices/${encodeURIComponent(id)}`,
      {
        headers: cookieHeader ? { cookie: cookieHeader } : undefined,
        cache: "no-store",
      },
    );
    if (res.status === 401) return null;
    if (!res.ok) return null;
    const json = (await res.json()) as { ok?: boolean; data?: InvoiceDetail };
    if (!json.ok || !json.data) return null;
    return json.data;
  } catch {
    return null;
  }
}

export default async function PrintSubscriptionInvoicePage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { id } = await params;
  const store = await cookies();
  // No session at all → send them to sign in and back, rather than showing a
  // 404 that reads as "your invoice is gone".
  if (store.getAll().length === 0) {
    redirect(`/login?next=/print/subscription-invoices/${id}`);
  }

  const data = await fetchSubscriptionInvoice(id);
  if (!data) notFound();

  return (
    <InvoiceDocument
      data={data}
      downloadHref={`/api/account/subscription-invoices/${encodeURIComponent(id)}/pdf`}
    />
  );
}
