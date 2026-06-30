"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { formatAppDate, formatAppTime } from "@/lib/format-datetime";
import { formatPriceRounded } from "@/lib/format-currency";
import { buildBookHref } from "@/lib/routing/book-href";
import type { CommonLocale } from "@/lib/i18n/types";

type Slot = {
  startAt: string;
  endAt: string;
  priceCents: number;
  pricingType?: "STANDARD" | "PEAK" | "OFF_PEAK";
  currencyCode: string;
};

type Props = {
  country: string;
  lang: string;
  serviceSlug: string;
  /** Aggregated open times across all doctors assigned to the service. */
  slots: Slot[];
  clinicTimezone?: string;
  i18n: CommonLocale["bookingForm"];
};

/**
 * Service-first TIME step (service → time → doctor). Shows the de-duplicated
 * open times across every doctor assigned to the service. Picking a time writes
 * `?service=&at=<startAt>` so the next step can offer the doctors free then.
 * Mirrors SlotPickerStep's date-pill UI but is doctor-agnostic.
 */
export function ServiceTimePicker({
  country,
  lang,
  serviceSlug,
  slots,
  clinicTimezone,
  i18n,
}: Props) {
  const router = useRouter();
  const [navigating, startNavigate] = useTransition();

  const tz = clinicTimezone ?? "Europe/Dublin";
  const tzLabel = tz.includes("/") ? tz.slice(tz.lastIndexOf("/") + 1).replace(/_/g, " ") : tz;

  const grouped = useMemo(() => {
    const map = new Map<string, Slot[]>();
    for (const s of slots) {
      const day = formatAppDate(s.startAt, tz);
      const list = map.get(day) ?? [];
      list.push(s);
      map.set(day, list);
    }
    return map;
  }, [slots, tz]);

  const firstSlot = slots[0] ?? null;
  const [selectedDay, setSelectedDay] = useState<string | null>(
    firstSlot ? formatAppDate(firstSlot.startAt, tz) : null,
  );

  function chooseTime(startAt: string) {
    startNavigate(() => {
      router.push(
        `${buildBookHref({ country, lang, service: serviceSlug, at: startAt })}#booking`,
      );
    });
  }

  if (slots.length === 0) {
    return <p className="text-sm text-[var(--color-text-muted)]">{i18n.noOpenSlots}</p>;
  }

  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--color-text-muted)]">
          {i18n.pickDate}
        </p>
        <p className="text-xs text-[var(--color-text-muted)]">
          {i18n.daysAvailable
            .replace("{count}", String(grouped.size))
            .replace("{day}", grouped.size === 1 ? i18n.day : i18n.days)
            .replace("{tz}", tzLabel)}
        </p>
      </div>

      {/* Date pills — local selection, no navigation. */}
      <div
        role="tablist"
        aria-label="Available dates"
        className="mt-3 -mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:thin]"
      >
        {Array.from(grouped.entries()).map(([day, daySlots]) => {
          const isActive = selectedDay === day;
          const firstSlotAt = daySlots[0]?.startAt;
          const date = firstSlotAt ? new Date(firstSlotAt) : null;
          const weekday = date ? date.toLocaleDateString(undefined, { weekday: "short", timeZone: tz }) : "";
          const dayNum = date ? date.toLocaleDateString(undefined, { day: "numeric", timeZone: tz }) : "";
          const month = date ? date.toLocaleDateString(undefined, { month: "short", timeZone: tz }) : "";
          return (
            <button
              key={day}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setSelectedDay(day)}
              disabled={navigating}
              className={
                isActive
                  ? "flex shrink-0 flex-col items-center gap-0.5 rounded-2xl border-2 border-[var(--color-brand-primary)] bg-[var(--color-brand-primary)] text-white px-4 py-3 min-w-[68px] shadow-[var(--shadow-card)]"
                  : "flex shrink-0 flex-col items-center gap-0.5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-background-page)] text-[var(--color-text-body)] px-4 py-3 min-w-[68px] transition-[border-color,background-color,transform] duration-200 hover:border-[var(--color-border-strong)] hover:bg-[var(--color-background-soft)] active:scale-[0.97] motion-reduce:transition-none motion-reduce:active:scale-100 disabled:opacity-60"
              }
            >
              <span className={isActive ? "text-[10px] font-bold uppercase tracking-[0.12em] text-white/80" : "text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--color-text-muted)]"}>
                {weekday}
              </span>
              <span className={isActive ? "text-2xl font-bold leading-none [font-variant-numeric:tabular-nums] text-white" : "text-2xl font-bold leading-none [font-variant-numeric:tabular-nums] text-[var(--color-text-primary)]"}>
                {dayNum}
              </span>
              <span className={isActive ? "text-[10px] font-semibold uppercase tracking-[0.1em] text-white/70" : "text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--color-text-muted)]"}>
                {month}
              </span>
              <span className={isActive ? "mt-1 text-[10px] font-semibold text-white/80" : "mt-1 text-[10px] font-semibold text-[var(--color-brand-primary)]"}>
                {daySlots.length} {daySlots.length === 1 ? i18n.slotSingular : i18n.slotPlural}
              </span>
            </button>
          );
        })}
      </div>

      {/* Time grid for the active day — picking a time advances to doctor. */}
      {selectedDay ? (
        <div className="mt-6">
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--color-text-muted)]">
            {i18n.pickTimeOn.replace("{date}", selectedDay)}
          </p>
          <div
            role="tabpanel"
            aria-label={`Times on ${selectedDay}`}
            className="mt-3 grid gap-2 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4"
          >
            {(grouped.get(selectedDay) ?? []).map((s) => (
              <button
                key={s.startAt}
                type="button"
                onClick={() => chooseTime(s.startAt)}
                disabled={navigating}
                className="inline-flex flex-col items-center justify-center rounded-xl border border-[var(--color-border)] bg-[var(--color-background-page)] text-[var(--color-text-primary)] px-3 py-2.5 text-sm font-semibold [font-variant-numeric:tabular-nums] transition-[border-color,background-color,transform] duration-200 hover:border-[var(--color-brand-primary)] hover:bg-[var(--color-background-soft)] active:scale-[0.97] motion-reduce:transition-none motion-reduce:active:scale-100 disabled:opacity-60"
              >
                <span className="inline-flex items-center gap-1">
                  {navigating ? <Loader2 className="size-3 animate-spin" aria-hidden /> : null}
                  {formatAppTime(s.startAt, tz)}
                </span>
                {typeof s.priceCents === "number" ? (
                  <span className="mt-0.5 text-xs font-medium text-[var(--color-text-muted)]">
                    {formatPriceRounded(s.priceCents, s.currencyCode ?? "EUR")}
                  </span>
                ) : null}
              </button>
            ))}
          </div>
          <p className="mt-4 text-xs text-[var(--color-text-muted)]">{i18n.pickTimeToContinue}</p>
        </div>
      ) : null}
    </div>
  );
}
