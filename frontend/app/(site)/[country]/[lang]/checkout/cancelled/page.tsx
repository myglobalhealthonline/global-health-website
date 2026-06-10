import Link from "next/link";
import { XCircle } from "lucide-react";

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
    <section className="mx-auto max-w-2xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="flex flex-col items-center text-center">
        <div
          className="inline-flex size-16 items-center justify-center rounded-full"
          style={{ background: "var(--color-status-warning-bg)", color: "var(--color-status-warning-text)" }}
        >
          <XCircle className="size-10" aria-hidden />
        </div>
        <h1 className="gh-h1 mt-6">
          Payment cancelled
        </h1>
        <p className="gh-body mt-3 max-w-md" style={{ color: "var(--color-text-muted)" }}>
          No charge was made. Your cart is still saved — you can return whenever
          you&apos;re ready.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href={cartHref} className="gh-btn gh-btn-primary">
            Back to cart
          </Link>
          <Link href="/account" className="gh-btn gh-btn-outline">
            Manage account
          </Link>
          <Link href={homeHref} className="gh-btn gh-btn-outline">
            Keep shopping
          </Link>
        </div>
      </div>
    </section>
  );
}
