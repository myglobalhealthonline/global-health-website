"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Check, ExternalLink, Loader2, X } from "lucide-react";
import {
  AdminTable,
  IconBtn,
  Pill,
  Td,
  Th,
  Thead,
  Tr,
  type PillTone,
} from "@/components/portal-atoms";
import { formatAppDate } from "@/lib/format-datetime";
import { formatPrice } from "@/lib/format-currency";

export type AdminOrderRow = {
  id: string;
  status: string;
  paymentStatus: string;
  email: string;
  fullName: string;
  countryCode: string;
  currencyCode: string;
  totalCents: number;
  itemCount: number;
  paidAt: string | null;
  createdAt: string;
};

function statusTone(status: string): PillTone {
  if (status === "PAID") return "published";
  if (status === "FULFILLED") return "active";
  if (status === "CANCELLED" || status === "REFUNDED") return "inactive";
  if (status === "PENDING") return "pending";
  return "neutral";
}

export function AdminOrdersTable({ items }: { items: AdminOrderRow[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (selected.size === items.length) setSelected(new Set());
    else setSelected(new Set(items.map((o) => o.id)));
  }

  async function bulkAction(status: "FULFILLED" | "CANCELLED") {
    const ids = [...selected];
    if (ids.length === 0) return;
    const verb = status === "FULFILLED" ? "Mark fulfilled" : "Cancel";
    if (
      !window.confirm(
        `${verb} ${ids.length} order${ids.length === 1 ? "" : "s"}? ${
          status === "CANCELLED"
            ? "HELD consultation slots will be released. Issue Stripe refunds separately."
            : ""
        }`,
      )
    ) {
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await fetch(`/api/admin/orders/bulk`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ids, status }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.ok) {
        setError(json?.message ?? "Bulk action failed");
        return;
      }
      setSelected(new Set());
      router.refresh();
    });
  }

  const allChecked = items.length > 0 && selected.size === items.length;
  const someChecked = selected.size > 0;

  return (
    <>
      {/* Bulk action bar */}
      {someChecked ? (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm">
          <span className="font-semibold text-emerald-900">
            {selected.size} selected
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void bulkAction("FULFILLED")}
              disabled={pending}
              className="inline-flex items-center gap-1.5 rounded-md bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-800 disabled:opacity-60"
            >
              {pending ? <Loader2 className="size-3 animate-spin" /> : <Check className="size-3" />}
              Mark fulfilled
            </button>
            <button
              type="button"
              onClick={() => void bulkAction("CANCELLED")}
              disabled={pending}
              className="inline-flex items-center gap-1.5 rounded-md border border-rose-300 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-60"
            >
              <X className="size-3" />
              Cancel orders
            </button>
            <button
              type="button"
              onClick={() => setSelected(new Set())}
              className="text-xs font-semibold text-emerald-800 hover:underline"
            >
              Clear
            </button>
          </div>
        </div>
      ) : null}

      {error ? (
        <div className="mb-3 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
          {error}
        </div>
      ) : null}

      <div className="overflow-x-auto">
        <AdminTable>
          <Thead>
            <Th style={{ width: 36 }}>
              <input
                type="checkbox"
                checked={allChecked}
                onChange={toggleAll}
                aria-label="Select all"
              />
            </Th>
            <Th>Order</Th>
            <Th>Customer</Th>
            <Th>Country</Th>
            <Th>Items</Th>
            <Th align="right">Total</Th>
            <Th>Status</Th>
            <Th>Created</Th>
            <Th align="right" style={{ width: 80 }}>
              {" "}
            </Th>
          </Thead>
          <tbody>
            {items.length === 0 ? (
              <Tr>
                <Td>
                  <span className="text-sm text-[var(--color-text-muted)]">
                    No orders yet.
                  </span>
                </Td>
              </Tr>
            ) : (
              items.map((o) => (
                <Tr key={o.id}>
                  <Td>
                    <input
                      type="checkbox"
                      checked={selected.has(o.id)}
                      onChange={() => toggle(o.id)}
                      aria-label={`Select order ${o.id}`}
                    />
                  </Td>
                  <Td>
                    <Link
                      href={`/admin/orders/${o.id}`}
                      className="font-mono text-xs text-[var(--color-brand-primary)] hover:underline"
                    >
                      #{o.id.slice(-8)}
                    </Link>
                  </Td>
                  <Td>
                    <span className="block font-semibold text-[var(--color-text-primary)]">
                      {o.fullName}
                    </span>
                    <span className="block text-xs text-[var(--color-text-muted)]">
                      {o.email}
                    </span>
                  </Td>
                  <Td>{o.countryCode.toUpperCase()}</Td>
                  <Td>{o.itemCount}</Td>
                  <Td align="right">
                    <span className="font-semibold text-[var(--color-text-primary)]">
                      {formatPrice(o.totalCents, o.currencyCode)}
                    </span>
                  </Td>
                  <Td>
                    <Pill tone={statusTone(o.status)}>{o.status.toLowerCase()}</Pill>
                  </Td>
                  <Td>{formatAppDate(o.createdAt)}</Td>
                  <Td align="right">
                    <IconBtn ariaLabel={`Open order ${o.id}`} href={`/admin/orders/${o.id}`}>
                      <ExternalLink className="size-3.5" aria-hidden />
                    </IconBtn>
                  </Td>
                </Tr>
              ))
            )}
          </tbody>
        </AdminTable>
      </div>
    </>
  );
}
