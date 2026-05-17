"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import type { ConsultationServiceLineDto } from "@/lib/api/doctor-api";

function formatPrice(cents: number | null, code: string | null) {
  if (cents == null) return "—";
  const v = cents / 100;
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: code ?? "USD",
    }).format(v);
  } catch {
    return `${v.toFixed(2)} ${code ?? ""}`;
  }
}

/**
 * Inline services-used editor for a Consultation. Only meaningful once
 * the doctor has saved at least one SOAP field (which materialises the
 * Consultation row) — when there's no consult id yet, this component
 * renders a hint instead.
 */
export function ServicesUsedList({
  consultationId,
  initialItems,
  locked,
}: {
  consultationId: string | null;
  initialItems: ConsultationServiceLineDto[];
  locked: boolean;
}) {
  const router = useRouter();
  const [items, setItems] = useState<ConsultationServiceLineDto[]>(initialItems);
  const [pending, startTransition] = useTransition();
  const [customLabel, setCustomLabel] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [unitPriceCents, setUnitPriceCents] = useState<number | "">("");
  const [currencyCode, setCurrencyCode] = useState("");
  const [error, setError] = useState<string | null>(null);

  if (!consultationId) {
    return (
      <p className="mt-3 text-[13px] text-[var(--color-text-muted)]">
        Save a draft of the consultation note first; line items attach to
        the consultation row.
      </p>
    );
  }

  function add(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (customLabel.trim() === "") {
      setError("Label is required.");
      return;
    }
    startTransition(async () => {
      const payload = {
        customLabel: customLabel.trim(),
        quantity,
        unitPriceCents: unitPriceCents === "" ? null : Number(unitPriceCents),
        currencyCode: currencyCode.trim() || null,
      };
      const res = await fetch(
        `/api/doctor/consultations/${consultationId}/services`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const json = (await res.json()) as {
        ok?: boolean;
        message?: string;
        data?: { line?: ConsultationServiceLineDto };
      };
      if (!res.ok || !json.ok) {
        setError(json.message ?? "Could not add.");
        return;
      }
      if (json.data?.line) {
        setItems((prev) => [...prev, json.data!.line!]);
      }
      setCustomLabel("");
      setQuantity(1);
      setUnitPriceCents("");
      setCurrencyCode("");
      router.refresh();
    });
  }

  function remove(id: string) {
    if (!confirm("Remove this line?")) return;
    startTransition(async () => {
      const res = await fetch(`/api/doctor/consultation-services/${id}`, {
        method: "DELETE",
      });
      const json = (await res.json()) as { ok?: boolean; message?: string };
      if (!res.ok || !json.ok) {
        setError(json.message ?? "Could not delete.");
        return;
      }
      setItems((prev) => prev.filter((r) => r.id !== id));
      router.refresh();
    });
  }

  const total = items.reduce((sum, r) => {
    if (r.unitPriceCents == null) return sum;
    return sum + r.unitPriceCents * r.quantity;
  }, 0);
  const currency = items.find((r) => r.currencyCode)?.currencyCode ?? null;

  return (
    <div className="mt-4 grid gap-3">
      {items.length === 0 ? (
        <p className="text-[13px] text-[var(--color-text-muted)]">
          No services logged for this consult.
        </p>
      ) : (
        <table className="w-full text-[13px]">
          <thead>
            <tr className="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--color-text-muted)]">
              <th className="py-2 text-left">Item</th>
              <th className="py-2 text-right">Qty</th>
              <th className="py-2 text-right">Unit</th>
              <th className="py-2 text-right">Line total</th>
              <th className="py-2" />
            </tr>
          </thead>
          <tbody>
            {items.map((r) => (
              <tr key={r.id} className="border-t border-[var(--color-border)]">
                <td className="py-2">
                  {r.service?.name ?? r.customLabel ?? "—"}
                </td>
                <td className="py-2 text-right font-mono">{r.quantity}</td>
                <td className="py-2 text-right font-mono">
                  {formatPrice(r.unitPriceCents, r.currencyCode)}
                </td>
                <td className="py-2 text-right font-mono">
                  {formatPrice(
                    r.unitPriceCents != null ? r.unitPriceCents * r.quantity : null,
                    r.currencyCode,
                  )}
                </td>
                <td className="py-2 text-right">
                  {locked ? null : (
                    <button
                      type="button"
                      onClick={() => remove(r.id)}
                      className="inline-flex items-center gap-1 text-[12px] font-semibold text-[var(--color-text-muted)] hover:text-[var(--color-status-error)]"
                      aria-label="Remove line"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {total > 0 ? (
              <tr className="border-t border-[var(--color-border)]">
                <td colSpan={3} className="py-2 text-right font-semibold">
                  Total
                </td>
                <td className="py-2 text-right font-mono font-semibold">
                  {formatPrice(total, currency)}
                </td>
                <td />
              </tr>
            ) : null}
          </tbody>
        </table>
      )}

      {locked ? null : (
        <form
          onSubmit={add}
          className="grid grid-cols-1 gap-2 sm:grid-cols-[2fr_60px_100px_80px_auto]"
        >
          <input
            type="text"
            placeholder="Label (e.g. ECG)"
            value={customLabel}
            onChange={(e) => setCustomLabel(e.target.value)}
            maxLength={200}
            className="gh-input"
          />
          <input
            type="number"
            min={1}
            max={20}
            value={quantity}
            onChange={(e) => setQuantity(Number(e.target.value))}
            className="gh-input"
            aria-label="Quantity"
          />
          <input
            type="number"
            min={0}
            placeholder="Cents"
            value={unitPriceCents}
            onChange={(e) =>
              setUnitPriceCents(e.target.value === "" ? "" : Number(e.target.value))
            }
            className="gh-input"
            aria-label="Unit price (cents)"
          />
          <input
            type="text"
            placeholder="EUR"
            value={currencyCode}
            onChange={(e) => setCurrencyCode(e.target.value.toUpperCase())}
            maxLength={3}
            className="gh-input"
            aria-label="Currency code"
          />
          <button type="submit" disabled={pending} className="gh-btn gh-btn-primary">
            <Plus className="size-3.5" /> Add
          </button>
        </form>
      )}
      {error ? (
        <p className="gh-status-warning rounded-md border px-3 py-2 text-[12.5px]">
          {error}
        </p>
      ) : null}
    </div>
  );
}
