"use client";

import { useState, useTransition, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useCart } from "@/components/cart/CartContext";
import type { CartItemKind } from "@/lib/api/cart-types";
import { formatAppDate, formatAppTime } from "@/lib/format-datetime";

type Slot = { id: string; startAt: string; endAt: string };

type Props = {
  doctorId: string;
  doctorName: string;
  serviceId: string;
  kind: Extract<CartItemKind, "GENERAL_CONSULTATION" | "SPECIALIST_CONSULTATION">;
  slots: Slot[];
};

export function ConsultationSlotPicker({
  doctorId,
  doctorName,
  serviceId,
  kind,
  slots,
}: Props) {
  const router = useRouter();
  const params = useParams<{ country: string; lang: string }>();
  const { add } = useCart();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Group slots by local day (Europe/Dublin)
  const grouped = useMemo(() => {
    const map = new Map<string, Slot[]>();
    for (const s of slots) {
      const day = formatAppDate(s.startAt);
      const list = map.get(day) ?? [];
      list.push(s);
      map.set(day, list);
    }
    return map;
  }, [slots]);

  function onPick(slot: Slot) {
    setError(null);
    startTransition(async () => {
      const res = await add({
        kind,
        serviceId,
        doctorId,
        timeSlotId: slot.id,
      });
      if (!res.ok) {
        setError(res.message ?? "Could not add to cart");
        return;
      }
      // Route params already carry the country/lang we're inside —
      // keep the URL country-scoped on the cart redirect.
      const country = params?.country ?? "";
      const lang = params?.lang ?? "";
      router.push(country && lang ? `/${country}/${lang}/cart` : "/cart");
    });
  }

  if (slots.length === 0) {
    return (
      <p className="mt-4 text-sm text-slate-500">
        No open slots in the next 14 days for {doctorName}.
      </p>
    );
  }

  return (
    <div className="mt-4">
      {error ? (
        <div className="mb-3 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
          {error}
        </div>
      ) : null}
      <div className="grid gap-4">
        {Array.from(grouped.entries()).map(([day, daySlots]) => (
          <div key={day}>
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">
              {day}
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {daySlots.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => onPick(s)}
                  disabled={pending}
                  className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-[13px] font-semibold text-emerald-800 transition hover:border-emerald-400 hover:bg-emerald-100 disabled:opacity-60"
                >
                  {pending ? (
                    <Loader2 className="size-3.5 animate-spin" aria-hidden />
                  ) : null}
                  {formatAppTime(s.startAt)}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
