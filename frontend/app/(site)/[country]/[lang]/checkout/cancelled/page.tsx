import Link from "next/link";
import { GH2StatusPage } from "@/components/sections/GH2PagePrimitives";

export const dynamic = "force-dynamic";

type Params = { country: string; lang: string };

export default async function CheckoutCancelledPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { country, lang } = await params;
  const cartHref = `/${country}/${lang}/cart`;
  const homeHref = `/${country}/${lang}`;
  return (
    <GH2StatusPage
      status="cancelled"
      title="Payment cancelled"
      body="No charge was made. Your cart is still saved and you can return when you are ready."
    >
      <Link href={cartHref} className="gh2-btn-lime">
        Back to cart
      </Link>
      <Link href={homeHref} className="rounded-full border border-[rgba(29,75,54,0.25)] px-6 py-4 text-sm font-semibold text-[var(--color-brand-primary)] hover:bg-[rgba(29,75,54,0.06)]">
        Keep shopping
      </Link>
    </GH2StatusPage>
  );
}
