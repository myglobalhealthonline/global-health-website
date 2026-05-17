"use client";

import { useEffect, useRef } from "react";

/**
 * `<input type="datetime-local">` whose value is set on the CLIENT from
 * a serialised ISO string. The schedule form previously prefilled this
 * server-side, which converted the saved UTC instant to the SERVER's
 * timezone — admins reopening a scheduled call saw the wrong local
 * time until they hit save.
 *
 * This component takes `initialIso` (the stored UTC ISO) and on mount
 * formats it as a "YYYY-MM-DDTHH:mm" string in the admin's browser
 * timezone using Date.prototype.getFullYear/getMonth/etc. The value
 * displayed always matches the wall clock the admin is reading.
 *
 * The `name` attribute keeps the submitted form payload identical to
 * the previous bare `<input>`, so the server action doesn't need to
 * change.
 */
type Props = {
  name: string;
  initialIso?: string | null;
  /** Optional id of the parent <form> when rendered outside of it. */
  formId?: string;
};

function isoToLocalInput(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function ScheduleSlotInput({ name, initialIso, formId }: Props) {
  const ref = useRef<HTMLInputElement | null>(null);

  // Set the initial value on mount. defaultValue="" means SSR renders
  // an empty input (no server-tz leakage); the client then fills it
  // in the user's local time before paint.
  useEffect(() => {
    if (!ref.current) return;
    ref.current.value = initialIso ? isoToLocalInput(initialIso) : "";
  }, [initialIso]);

  return (
    <input
      ref={ref}
      type="datetime-local"
      name={name}
      className="gh-input"
      defaultValue=""
      {...(formId ? { form: formId } : {})}
    />
  );
}
