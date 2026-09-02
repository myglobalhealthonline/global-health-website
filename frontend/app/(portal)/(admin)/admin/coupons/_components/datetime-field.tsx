"use client";

import { useEffect, useState } from "react";

/**
 * A `datetime-local` input that submits an ABSOLUTE instant.
 *
 * The visible input carries a naive wall-clock string ("2026-09-02T19:30")
 * with no timezone in it. Server Actions run on the server, so parsing that
 * string there resolves it in the SERVER's zone — UTC on Railway — not the
 * admin's. An admin in UTC+5 setting a coupon to start "now" produced a
 * validFrom five hours in the future, and the coupon answered "not valid yet"
 * until then.
 *
 * So the conversion happens here, in the browser, where the wall clock and the
 * zone belong to the same person: the visible input is unnamed, and a hidden
 * sibling carries `toISOString()`. The server then parses an unambiguous
 * instant and cannot get the zone wrong.
 */
/** Absolute instant → the admin's own wall clock, for the visible input. */
function toLocalInput(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function DateTimeField({
  name,
  label,
  defaultValue,
  defaultIso,
  hint,
  required,
}: {
  name: string;
  label: string;
  /** Naive local wall-clock value, `YYYY-MM-DDTHH:mm`. */
  defaultValue?: string;
  /** An existing absolute instant to edit. Converted to local on mount. */
  defaultIso?: string;
  hint?: string;
  required?: boolean;
}) {
  const [value, setValue] = useState(defaultValue ?? "");

  // Filled after mount rather than during render: the server prerenders this
  // component too, and it would format the instant in the SERVER's zone,
  // producing a hydration mismatch against the browser's.
  useEffect(() => {
    if (defaultIso) setValue(toLocalInput(defaultIso));
  }, [defaultIso]);

  const iso = (() => {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? "" : parsed.toISOString();
  })();

  return (
    <label>
      <span className="gh-field-label">{label}</span>
      <input
        className="gh-input"
        type="datetime-local"
        value={value}
        required={required}
        onChange={(e) => setValue(e.target.value)}
      />
      <input type="hidden" name={name} value={iso} readOnly />
      {hint ? <small className="mt-1 block text-[var(--color-text-muted)]">{hint}</small> : null}
    </label>
  );
}
