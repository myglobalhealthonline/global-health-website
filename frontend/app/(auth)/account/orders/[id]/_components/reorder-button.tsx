"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { useCart } from "@/components/cart/CartContext";
import { Btn } from "@/components/portal-atoms";

type ReorderableItem = {
  kind: "HEALTH_TEST" | "PRESCRIPTION_SERVICE" | "GENERAL_CONSULTATION" | "SPECIALIST_CONSULTATION";
  healthTestId: string | null;
  serviceId: string | null;
  quantity: number;
};

/** Re-adds every reorderable line from a past order to the live cart, then
 *  sends the patient to checkout. Consultation lines (no healthTestId/
 *  serviceId — they need a fresh appointment slot, not a cart re-add) are
 *  skipped rather than guessed at. */
export function ReorderButton({ items }: { items: ReorderableItem[] }) {
  const { add } = useCart();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const reorderable = items.filter((i) => i.healthTestId || i.serviceId);
  if (reorderable.length === 0) return null;

  function onClick() {
    setError(null);
    startTransition(async () => {
      for (const item of reorderable) {
        const qty = Math.max(1, item.quantity);
        for (let i = 0; i < qty; i++) {
          const res = await add({
            kind: item.kind,
            healthTestId: item.healthTestId ?? undefined,
            serviceId: item.serviceId ?? undefined,
          });
          if (!res.ok) {
            setError(res.message ?? "Could not add every item to your cart.");
            return;
          }
        }
      }
      router.push("/cart");
    });
  }

  return (
    <div className="flex flex-col items-start gap-1.5">
      <Btn
        variant="secondary"
        size="sm"
        iconLeft={<RefreshCw className="size-3.5" aria-hidden />}
        onClick={onClick}
        disabled={pending}
        loading={pending}
      >
        {pending ? "Adding to cart…" : "Reorder"}
      </Btn>
      {error ? (
        <p className="text-xs text-rose-700" role="alert">{error}</p>
      ) : null}
    </div>
  );
}
