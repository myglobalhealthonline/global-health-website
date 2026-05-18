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
    <main className="mx-auto max-w-2xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="flex flex-col items-center text-center">
        <div className="inline-flex size-16 items-center justify-center rounded-full bg-amber-50 text-amber-700">
          <XCircle className="size-10" aria-hidden />
        </div>
        <h1 className="mt-6 text-3xl font-bold text-slate-900 sm:text-4xl">
          Payment cancelled
        </h1>
        <p className="mt-3 max-w-md text-slate-600">
          No charge was made. Your cart is still saved — you can return whenever
          you&apos;re ready.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            href={cartHref}
            className="inline-flex items-center gap-2 rounded-md bg-emerald-700 px-6 py-3 text-sm font-semibold text-white hover:bg-emerald-800"
          >
            Back to cart
          </Link>
          <Link
            href={homeHref}
            className="inline-flex items-center gap-2 rounded-md border border-slate-300 px-6 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Keep shopping
          </Link>
        </div>
      </div>
    </main>
  );
}
