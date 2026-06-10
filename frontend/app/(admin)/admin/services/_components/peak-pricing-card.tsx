import { AdminCard } from "../../_components/atoms";
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

const labelClass =
  "block text-xs font-semibold text-[var(--color-text-body)] mb-1";
const inputClass =
  "block w-full rounded-md border border-[var(--color-border)] bg-[var(--color-background-page)] px-3 py-2 text-sm text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-primary)]/40";

/**
 * Admin card for a consultation service's fixed peak-hour pricing.
 *
 * Times are entered as wall-clock (clinic timezone) and posted as minute-of-day.
 * Prices are decimal amounts posted and stored as integer cents. The window
 * end is exclusive (18:00–22:00 → a 22:00 slot is off-peak).
 */
export function PeakPricingCard({
  action,
  config,
  defaultCurrency,
  success,
  error,
}: Props) {
  return (
    <AdminCard>
      <h3
        className="m-0 text-[var(--color-text-primary)]"
        style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 800 }}
      >
        Peak-hour pricing
      </h3>
      <p className="mb-4 mt-1 text-[13px] text-[var(--color-text-muted)]">
        Charge more during busy hours. When enabled, booking slots inside the
        window show the peak price; all other slots show the off-peak price.
        Times are in the clinic timezone. The end time is exclusive.
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

      <form action={action} className="flex flex-col gap-4">
        <label className="flex items-center gap-2 text-sm font-semibold text-[var(--color-text-body)]">
          <input
            type="checkbox"
            name="enabled"
            defaultChecked={config?.enabled ?? false}
            className="size-4 rounded border-[var(--color-border)]"
          />
          Enable peak-hour pricing for this service
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass} htmlFor="peakStart">
              Peak start
            </label>
            <input
              id="peakStart"
              type="time"
              name="peakStart"
              required
              defaultValue={minutesToHHMM(config?.peakStartMinute ?? 18 * 60)}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="peakEnd">
              Peak end (exclusive)
            </label>
            <input
              id="peakEnd"
              type="time"
              name="peakEnd"
              required
              defaultValue={minutesToHHMM(config?.peakEndMinute ?? 22 * 60)}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="peakPrice">
              Peak price
            </label>
            <input
              id="peakPrice"
              type="text"
              inputMode="decimal"
              name="peakPrice"
              placeholder="49.00"
              defaultValue={
                config ? (config.peakPriceCents / 100).toFixed(2) : ""
              }
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
              placeholder="39.00"
              defaultValue={
                config ? (config.offPeakPriceCents / 100).toFixed(2) : ""
              }
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
          <button type="submit" className="gh-btn gh-btn-primary">
            Save peak pricing
          </button>
        </div>
      </form>
    </AdminCard>
  );
}
