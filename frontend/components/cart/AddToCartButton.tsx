"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, ShoppingCart } from "lucide-react";
import { useCart } from "./CartContext";
import type { CartItemKind } from "@/lib/api/cart-types";
import { getCountryByCode, type CountryCode } from "@/data/countries";
import { COUNTRY_CODE_TO_SLUG } from "@/lib/routing/country-slug";

type Props = {
  kind: CartItemKind;
  healthTestId?: string;
  serviceId?: string;
  /** Optional CTA override, e.g. "Add to cart · €50". */
  label?: string;
  className?: string;
};

export function AddToCartButton({
  kind,
  healthTestId,
  serviceId,
  label,
  className,
}: Props) {
  const router = useRouter();
  const { add, cart } = useCart();
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<
    | { kind: "ok" }
    | { kind: "err"; message: string; conflict?: string }
    | null
  >(null);

  function onClick() {
    setFeedback(null);
    startTransition(async () => {
      const res = await add({ kind, healthTestId, serviceId });
      if (res.ok) {
        setFeedback({ kind: "ok" });
        setTimeout(() => setFeedback(null), 2400);
      } else {
        setFeedback({
          kind: "err",
          message: res.message ?? "Could not add to cart",
          conflict: res.conflict,
        });
      }
    });
  }

  return (
    <div className="flex flex-col items-stretch gap-1.5">
      <button
        type="button"
        onClick={onClick}
        disabled={pending}
        className={
          className ??
          "inline-flex items-center justify-center gap-2 rounded-md bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-800 disabled:opacity-60"
        }
      >
        {pending ? (
          <Loader2 className="size-4 animate-spin" aria-hidden />
        ) : feedback?.kind === "ok" ? (
          <Check className="size-4" aria-hidden />
        ) : (
          <ShoppingCart className="size-4" aria-hidden />
        )}
        {pending ? "Adding…" : feedback?.kind === "ok" ? "Added" : (label ?? "Add to cart")}
      </button>
      {feedback?.kind === "err" ? (
        <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          {feedback.message}
          {feedback.conflict === "country_mismatch" ? (
            <button
              type="button"
              onClick={() => {
                const config = cart.countryCode
                  ? getCountryByCode(cart.countryCode.toLowerCase() as CountryCode)
                  : null;
                if (config) {
                  const slug = COUNTRY_CODE_TO_SLUG[config.code] ?? config.code;
                  const lang = (config.defaultLocale ?? "en").toLowerCase();
                  router.push(`/${slug}/${lang}/cart`);
                } else {
                  router.push("/cart");
                }
              }}
              className="ml-2 font-semibold underline"
            >
              View cart
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
