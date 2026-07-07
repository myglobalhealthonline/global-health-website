"use client";

import { useRouter } from "next/navigation";
import { useTransition, type FormEvent } from "react";
import { Search, X, Loader2 } from "lucide-react";

/** Consultation / item types — must mirror the backend `CART_ITEM_KINDS` enum. */
const KIND_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "Any type" },
  { value: "GENERAL_CONSULTATION", label: "General consultation" },
  { value: "SPECIALIST_CONSULTATION", label: "Specialist consultation" },
  { value: "PRESCRIPTION_SERVICE", label: "Prescription service" },
  { value: "HEALTH_TEST", label: "Health test" },
];

export type InvoiceFilterValues = {
  q?: string;
  kind?: string;
  invoiceFrom?: string;
  invoiceTo?: string;
  consultFrom?: string;
  consultTo?: string;
};

const labelCls =
  "mb-1 block text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--color-text-muted)]";
const fieldCls =
  "w-full rounded-md border border-[var(--color-border)] bg-white px-3 py-2 text-[13px] text-[var(--color-text-primary)] outline-none focus:border-[var(--color-brand-primary)]";

export function InvoiceFilters({ values }: { values: InvoiceFilterValues }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const hasActiveFilter = Boolean(
    values.q ||
      values.kind ||
      values.invoiceFrom ||
      values.invoiceTo ||
      values.consultFrom ||
      values.consultTo,
  );

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const params = new URLSearchParams();
    // Reset cursor on any new search — filters change the result set.
    for (const key of ["q", "kind", "invoiceFrom", "invoiceTo", "consultFrom", "consultTo"]) {
      const val = (data.get(key) as string | null)?.trim();
      if (val) params.set(key, val);
    }
    const qs = params.toString();
    startTransition(() => {
      router.push(qs ? `/admin/invoices?${qs}` : "/admin/invoices");
    });
  }

  function handleClear() {
    startTransition(() => {
      router.push("/admin/invoices");
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="gh-admin-invoices-filters border-b border-[var(--color-border)] px-4 py-4"
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div className="lg:col-span-3">
          <label className={labelCls} htmlFor="inv-filter-q">
            Search
          </label>
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--color-text-muted)]"
              aria-hidden
            />
            <input
              id="inv-filter-q"
              name="q"
              type="text"
              defaultValue={values.q ?? ""}
              placeholder="Patient name, email, phone, ID card, invoice # or order #"
              className={`${fieldCls} pl-9`}
            />
          </div>
        </div>

        <div>
          <label className={labelCls} htmlFor="inv-filter-kind">
            Consultation type
          </label>
          <select
            id="inv-filter-kind"
            name="kind"
            defaultValue={values.kind ?? ""}
            className={fieldCls}
          >
            {KIND_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={labelCls} htmlFor="inv-filter-invoiceFrom">
            Invoice date — from
          </label>
          <input
            id="inv-filter-invoiceFrom"
            name="invoiceFrom"
            type="date"
            defaultValue={values.invoiceFrom ?? ""}
            className={fieldCls}
          />
        </div>

        <div>
          <label className={labelCls} htmlFor="inv-filter-invoiceTo">
            Invoice date — to
          </label>
          <input
            id="inv-filter-invoiceTo"
            name="invoiceTo"
            type="date"
            defaultValue={values.invoiceTo ?? ""}
            className={fieldCls}
          />
        </div>

        <div>
          <label className={labelCls} htmlFor="inv-filter-consultFrom">
            Consultation date — from
          </label>
          <input
            id="inv-filter-consultFrom"
            name="consultFrom"
            type="date"
            defaultValue={values.consultFrom ?? ""}
            className={fieldCls}
          />
        </div>

        <div>
          <label className={labelCls} htmlFor="inv-filter-consultTo">
            Consultation date — to
          </label>
          <input
            id="inv-filter-consultTo"
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
          className="inline-flex items-center gap-1.5 rounded-md bg-[var(--color-brand-primary)] px-4 py-2 text-[13px] font-semibold text-white hover:opacity-90 disabled:opacity-60"
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
            className="inline-flex items-center gap-1.5 rounded-md border border-[var(--color-border)] bg-white px-4 py-2 text-[13px] font-semibold text-[var(--color-text-primary)] hover:bg-[var(--color-bg-subtle)] disabled:opacity-60"
          >
            <X className="size-3.5" aria-hidden />
            Clear
          </button>
        ) : null}
      </div>
    </form>
  );
}
