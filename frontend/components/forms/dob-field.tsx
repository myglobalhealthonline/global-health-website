"use client";

import { useEffect, useState } from "react";

/** ISO `YYYY-MM-DD` → `DD/MM/YYYY` display (empty when not a full ISO date). */
export function isoToDisplayDob(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso.trim());
  if (!m) return "";
  return `${m[3]}/${m[2]}/${m[1]}`;
}

type Props = {
  name: string;
  /** Initial value in ISO `YYYY-MM-DD` (e.g. the signed-in user's DOB). */
  defaultValue?: string;
  /** Latest selectable date, ISO `YYYY-MM-DD` (e.g. today, to block future DOBs). */
  max?: string;
  className?: string;
  id?: string;
  required?: boolean;
  "aria-required"?: boolean | "true" | "false";
};

/**
 * Date-of-birth entry backed by the browser's native date picker. Value is
 * ISO `YYYY-MM-DD` throughout — no custom parsing needed.
 */
export function DobField({
  name,
  defaultValue = "",
  max,
  className,
  id,
  ...rest
}: Props) {
  const [value, setValue] = useState(defaultValue);

  // Prefill once the async user profile arrives, but never clobber what the
  // patient has already picked.
  useEffect(() => {
    if (defaultValue) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- defaultValue arrives async from the profile fetch, only known post-mount
      setValue((cur) => (cur === "" ? defaultValue : cur));
    }
  }, [defaultValue]);

  return (
    <input
      type="date"
      name={name}
      max={max}
      value={value}
      id={id}
      className={className}
      onChange={(e) => setValue(e.target.value)}
      {...rest}
    />
  );
}
