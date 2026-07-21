"use client";

import { useRouter } from "next/navigation";
import { useTransition, type FormEvent } from "react";
import { Search, X, Loader2 } from "lucide-react";

/** Order lifecycle — mirrors the backend `OrderStatus` enum. */
const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "All statuses" },
  { value: "PENDING", label: "Pending" },
  { value: "PAID", label: "Paid" },
  { value: "FULFILLED", label: "Fulfilled" },
  { value: "CANCELLED", label: "Cancelled" },
  { value: "REFUNDED", label: "Refunded" },
];

/** Payment state — mirrors the backend `PaymentStatus` enum. */
const PAYMENT_STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "Any payment" },
  { value: "UNPAID", label: "Unpaid" },
  { value: "PENDING", label: "Payment pending" },
  { value: "PAID", label: "Paid" },
  { value: "REFUNDED", label: "Refunded" },
  { value: "FAILED", label: "Failed" },
];

export type OrderFilterValues = {
  q?: string;
  status?: string;
  paymentStatus?: string;
  doctorName?: string;
  createdFrom?: string;
  createdTo?: string;
  consultFrom?: string;
  consultTo?: string;
};

/** Every key the form writes back to the URL. */
export const ORDER_FILTER_KEYS = [
  "q",
  "status",
  "paymentStatus",
  "doctorName",
  "createdFrom",
  "createdTo",
  "consultFrom",
  "consultTo",
] as const;

const labelCls =
  "mb-1 block text-portal-micro font-bold uppercase tracking-[0.08em] text-[var(--color-text-muted)]";
const fieldCls =
  "w-full rounded-md border border-[var(--color-border)] bg-white px-3 py-2 text-portal-compact text-[var(--color-text-primary)] outline-none focus:border-[var(--color-brand-primary)]";

export function OrderFilters({
  values,
  doctorOptions,
}: {
  values: OrderFilterValues;
  doctorOptions: { value: string; label: string }[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const hasActiveFilter = ORDER_FILTER_KEYS.some((key) => Boolean(values[key]));

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const params = new URLSearchParams();
    // The cursor is deliberately dropped — a new filter set means a new result
    // page, and an old cursor would skip into the middle of it.
    for (const key of ORDER_FILTER_KEYS) {
      const val = (data.get(key) as string | null)?.trim();
      if (val) params.set(key, val);
    }
    const qs = params.toString();
    startTransition(() => {
      router.push(qs ? `/admin/orders?${qs}` : "/admin/orders");
    });
  }

  function handleClear() {
    startTransition(() => {
      router.push("/admin/orders");
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="gh-admin-orders-filters border-b border-[var(--color-border)] px-4 py-4"
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div className="lg:col-span-3">
          <label className={labelCls} htmlFor="order-filter-q">
            Search
          </label>
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--color-text-muted)]"
              aria-hidden
            />
            <input
              id="order-filter-q"
              name="q"
              type="text"
              defaultValue={values.q ?? ""}
              placeholder="Order #, patient name, email, phone or doctor"
              className={`${fieldCls} pl-9`}
            />
          </div>
        </div>

        <div>
          <label className={labelCls} htmlFor="order-filter-status">
            Status
          </label>
          <select
            id="order-filter-status"
            name="status"
            defaultValue={values.status ?? ""}
            className={fieldCls}
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={labelCls} htmlFor="order-filter-paymentStatus">
            Payment
          </label>
          <select
            id="order-filter-paymentStatus"
            name="paymentStatus"
            defaultValue={values.paymentStatus ?? ""}
            className={fieldCls}
          >
            {PAYMENT_STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={labelCls} htmlFor="order-filter-doctorName">
            Doctor
          </label>
          <select
            id="order-filter-doctorName"
            name="doctorName"
            defaultValue={values.doctorName ?? ""}
            className={fieldCls}
          >
            {doctorOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={labelCls} htmlFor="order-filter-createdFrom">
            Order date — from
          </label>
          <input
            id="order-filter-createdFrom"
            name="createdFrom"
            type="date"
            defaultValue={values.createdFrom ?? ""}
            className={fieldCls}
          />
        </div>

        <div>
          <label className={labelCls} htmlFor="order-filter-createdTo">
            Order date — to
          </label>
          <input
            id="order-filter-createdTo"
            name="createdTo"
            type="date"
            defaultValue={values.createdTo ?? ""}
            className={fieldCls}
          />
        </div>

        <div>
          <label className={labelCls} htmlFor="order-filter-consultFrom">
            Consultation date — from
          </label>
          <input
            id="order-filter-consultFrom"
            name="consultFrom"
            type="date"
            defaultValue={values.consultFrom ?? ""}
            className={fieldCls}
          />
        </div>

        <div>
          <label className={labelCls} htmlFor="order-filter-consultTo">
            Consultation date — to
          </label>
          <input
            id="order-filter-consultTo"
            name="consultTo"
            type="date"
            defaultValue={values.consultTo ?? ""}
            className={fieldCls}
          />
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center gap-1.5 rounded-md bg-[var(--color-brand-primary)] px-4 py-2 text-portal-compact font-semibold text-white hover:opacity-90 disabled:opacity-60"
        >
          {pending ? (
            <Loader2 className="size-3.5 animate-spin" aria-hidden />
          ) : (
            <Search className="size-3.5" aria-hidden />
          )}
          Search
        </button>
        {hasActiveFilter ? (
          <button
            type="button"
            onClick={handleClear}
            disabled={pending}
            className="inline-flex items-center gap-1.5 rounded-md border border-[var(--color-border)] bg-white px-4 py-2 text-portal-compact font-semibold text-[var(--color-text-primary)] hover:bg-[var(--color-bg-subtle)] disabled:opacity-60"
          >
            <X className="size-3.5" aria-hidden />
            Clear
          </button>
        ) : null}
      </div>
    </form>
  );
}
