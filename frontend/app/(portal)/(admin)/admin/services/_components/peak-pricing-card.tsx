"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { AdminCard } from "../../_components/atoms";
import { PendingSubmitButton } from "@/components/admin/pending-submit";
import type { AdminPeakPricingDto } from "@/lib/admin/admin-api";

/** Minute-of-day (0..1440) → "HH:MM" for a native <input type="time">. */
function minutesToHHMM(minutes: number): string {
  const m = Math.max(0, Math.min(1440, minutes));
  const hh = String(Math.floor(m / 60)).padStart(2, "0");
  const mm = String(m % 60).padStart(2, "0");
  return `${hh}:${mm}`;
}

type Props = {
  /** Server action that reads the form fields and upserts the config. */
  action: (formData: FormData) => void | Promise<void>;
  config: AdminPeakPricingDto | null;
  /** Service/country currency, used as the default when no config exists. */
  defaultCurrency: string;
  success?: string;
  error?: string;
};

type WindowRow = { start: string; end: string; price: string };

const labelClass =
  "block text-xs font-semibold text-[var(--color-text-body)] mb-1";
const inputClass =
  "block w-full rounded-md border border-[var(--color-border)] bg-[var(--color-background-page)] px-3 py-2 text-sm text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-primary)]/40";

function initialWindows(config: AdminPeakPricingDto | null): WindowRow[] {
  if (config?.windows && config.windows.length > 0) {
    return config.windows.map((w) => ({
      start: minutesToHHMM(w.startMinute),
      end: minutesToHHMM(w.endMinute),
      price: w.priceCents != null ? (w.priceCents / 100).toFixed(2) : "",
    }));
  }
  return [{ start: "18:00", end: "22:00", price: "" }];
}

/**
 * Admin card for a consultation service's fixed peak-hour pricing.
 *
 * One peak price applies across one or more clinic-local windows — add as many
 * as you need (e.g. 11:00–12:00 AND 16:00–17:00). Times are wall-clock (clinic
 * timezone), posted as minute-of-day; the window end is exclusive (18:00–22:00
 * → a 22:00 slot is off-peak). Prices are decimals, stored as integer cents.
 */
export function PeakPricingCard({
  action,
  config,
  defaultCurrency,
  success,
  error,
}: Props) {
  const [windows, setWindows] = useState<WindowRow[]>(() => initialWindows(config));

  function updateWindow(i: number, patch: Partial<WindowRow>) {
    setWindows((rows) => rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }
  function addWindow() {
    setWindows((rows) => [...rows, { start: "09:00", end: "10:00", price: "" }]);
  }
  function removeWindow(i: number) {
    setWindows((rows) => (rows.length <= 1 ? rows : rows.filter((_, idx) => idx !== i)));
  }

  return (
    <AdminCard>
      <h3
        className="m-0 text-[var(--color-text-primary)]"
        style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 800 }}
      >
        Peak-hour pricing
      </h3>
      <p className="mb-4 mt-1 text-portal-compact text-[var(--color-text-muted)]">
        Charge more during busy hours. When enabled, booking slots inside any
        peak window show the peak price; all other slots show the off-peak
        price. Add multiple windows if your busy hours are split (e.g.
        11:00–12:00 and 16:00–17:00). Times are in the clinic timezone. The end
        time is exclusive. Each window can carry its own price (e.g. a €39
        lunch promo and a €55 evening rate); leave a window&apos;s price blank
        to use the shared peak price.
      </p>

      {success ? (
        <p className="gh-status-success mb-4 rounded-[var(--radius-card-sm)] border px-4 py-3 text-sm">
          {success}
        </p>
      ) : null}
      {error ? (
        <p className="gh-status-warning mb-4 rounded-[var(--radius-card-sm)] border px-4 py-3 text-sm">
          {error}
        </p>
      ) : null}

      <form action={action} className="gh-admin-service-peak-form">
        <label className="gh-admin-service-active-row">
          <input
            type="checkbox"
            name="enabled"
            defaultChecked={config?.enabled ?? false}
            className="size-4 rounded border-[var(--color-border)]"
          />
          Enable peak-hour pricing for this service
        </label>

        {/* Peak windows — repeater */}
        <div className="gh-admin-service-peak-windows">
          <span className={labelClass}>Peak windows</span>
          {windows.map((w, i) => (
            <div key={i} className="gh-admin-service-peak-row">
              <div className="flex-1">
                <label className={labelClass} htmlFor={`peakStart-${i}`}>
                  {i === 0 ? "Peak start" : `Start ${i + 1}`}
                </label>
                <input
                  id={`peakStart-${i}`}
                  type="time"
                  name="peakStart"
                  required
                  value={w.start}
                  onChange={(e) => updateWindow(i, { start: e.target.value })}
                  className={inputClass}
                />
              </div>
              <div className="flex-1">
                <label className={labelClass} htmlFor={`peakEnd-${i}`}>
                  {i === 0 ? "Peak end (exclusive)" : `End ${i + 1} (exclusive)`}
                </label>
                <input
                  id={`peakEnd-${i}`}
                  type="time"
                  name="peakEnd"
                  required
                  value={w.end}
                  onChange={(e) => updateWindow(i, { end: e.target.value })}
                  className={inputClass}
                />
              </div>
              <div className="flex-1">
                <label className={labelClass} htmlFor={`peakWindowPrice-${i}`}>
                  {i === 0 ? "Window price (optional)" : `Price ${i + 1} (optional)`}
                </label>
                <input
                  id={`peakWindowPrice-${i}`}
                  type="text"
                  inputMode="decimal"
                  name="peakWindowPrice"
                  placeholder="Peak price"
                  pattern="^\d+(\.\d{1,2})?$"
                  title="Enter a valid amount like 39 or 39.00 — blank uses the peak price"
                  value={w.price}
                  onChange={(e) => updateWindow(i, { price: e.target.value })}
                  className={inputClass}
                />
              </div>
              <button
                type="button"
                onClick={() => removeWindow(i)}
                disabled={windows.length <= 1}
                aria-label="Remove window"
                className="gh-btn gh-btn-soft mb-0.5 inline-flex items-center disabled:opacity-40"
              >
                <Trash2 className="size-3.5" aria-hidden />
              </button>
            </div>
          ))}
          <div>
            <button
              type="button"
              onClick={addWindow}
              className="gh-btn gh-btn-soft inline-flex items-center gap-1.5"
            >
              <Plus className="size-3.5" aria-hidden />
              Add window
            </button>
          </div>
        </div>

        {/* Prices + currency — one set for all windows */}
        <div className="gh-admin-service-field-grid gh-admin-service-field-grid--three">
          <div>
            <label className={labelClass} htmlFor="peakPrice">
              Peak price
            </label>
            <input
              id="peakPrice"
              type="text"
              inputMode="decimal"
              name="peakPrice"
              placeholder="0.00"
              pattern="^\d+(\.\d{1,2})?$"
              title="Enter a valid amount like 49 or 49.00"
              defaultValue={config ? (config.peakPriceCents / 100).toFixed(2) : ""}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="offPeakPrice">
              Off-peak price
            </label>
            <input
              id="offPeakPrice"
              type="text"
              inputMode="decimal"
              name="offPeakPrice"
              placeholder="0.00"
              pattern="^\d+(\.\d{1,2})?$"
              title="Enter a valid amount like 49 or 49.00"
              defaultValue={config ? (config.offPeakPriceCents / 100).toFixed(2) : ""}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="peakCurrency">
              Currency
            </label>
            <input
              id="peakCurrency"
              type="text"
              name="currencyCode"
              maxLength={3}
              defaultValue={config?.currencyCode ?? defaultCurrency}
              className={`${inputClass} font-mono uppercase`}
            />
          </div>
        </div>

        <div>
          {/* Prices on a live service — a double submit upserts the same
              config twice and the second write races the redirect that
              carries the success message. */}
          <PendingSubmitButton busyLabel="Saving…">
            Save peak pricing
          </PendingSubmitButton>
        </div>
      </form>
    </AdminCard>
  );
}
