"use client";

import { Globe } from "lucide-react";
import { timeZoneLabel } from "@/lib/timezones";

type Props = {
  value: string;
  options: string[];
  onChange: (tz: string) => void;
  label?: string;
};

/**
 * Display-only timezone switcher. The parent owns the value (and any
 * persistence); this just renders the labelled select. Used by the doctor
 * calendar so a multi-country doctor can read their day in any of their
 * clinic zones without changing how availability is authored.
 */
export function TimezoneSelect({ value, options, onChange, label = "View in" }: Props) {
  if (options.length <= 1) return null;
  return (
    <label className="inline-flex items-center gap-2 text-sm">
      <Globe className="size-4" style={{ color: "var(--portal-muted)" }} aria-hidden />
      <span className="text-xs font-semibold" style={{ color: "var(--portal-muted)" }}>{label}</span>
      <select
        className="gh-select h-9 min-h-0 py-0 text-sm"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((tz) => (
          <option key={tz} value={tz}>
            {timeZoneLabel(tz)}
          </option>
        ))}
      </select>
    </label>
  );
}
