"use client";

import { useEffect, useState } from "react";

/** ISO `YYYY-MM-DD` → `DD/MM/YYYY` display (empty when not a full ISO date). */
export function isoToDisplayDob(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso.trim());
  if (!m) return "";
  return `${m[3]}/${m[2]}/${m[1]}`;
}

/** Raw keystrokes → `DD/MM/YYYY` with slashes auto-inserted as the patient
 *  types. Non-digits are dropped, so the patient never has to type `/`. */
function formatDisplayDob(raw: string): string {
  const d = raw.replace(/\D/g, "").slice(0, 8);
  const dd = d.slice(0, 2);
  const mm = d.slice(2, 4);
  const yyyy = d.slice(4, 8);
  if (d.length <= 2) return dd;
  if (d.length <= 4) return `${dd}/${mm}`;
  return `${dd}/${mm}/${yyyy}`;
}

/** `DD/MM/YYYY` → ISO `YYYY-MM-DD`, or "" when incomplete / out of range.
 *  The submitted value stays ISO so every downstream consumer is unchanged. */
function displayToIsoDob(display: string): string {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(display);
  if (!m) return "";
  const [, dd, mm, yyyy] = m;
  const day = Number(dd);
  const month = Number(mm);
  if (month < 1 || month > 12 || day < 1 || day > 31) return "";
  return `${yyyy}-${mm}-${dd}`;
}

type Props = {
  /** Form field name — a hidden input carries the ISO value under this name. */
  name: string;
  /** Initial value in ISO `YYYY-MM-DD` (e.g. the signed-in user's DOB). */
  defaultValue?: string;
  className?: string;
  id?: string;
  required?: boolean;
  "aria-required"?: boolean | "true" | "false";
};

/**
 * Date-of-birth entry that shows and edits as `DD/MM/YYYY` while submitting
 * ISO `YYYY-MM-DD`. Patients type digits only; slashes appear automatically.
 */
export function DobField({
  name,
  defaultValue = "",
  className,
  id,
  ...rest
}: Props) {
  const [display, setDisplay] = useState(() => isoToDisplayDob(defaultValue));

  // Prefill once the async user profile arrives, but never clobber what the
  // patient has already started typing.
  useEffect(() => {
    if (defaultValue) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- defaultValue arrives async from the profile fetch, only known post-mount
      setDisplay((cur) => (cur === "" ? isoToDisplayDob(defaultValue) : cur));
    }
  }, [defaultValue]);

  const iso = displayToIsoDob(display);

  return (
    <>
      <input
        type="text"
        inputMode="numeric"
        placeholder="DD/MM/YYYY"
        pattern="\d{2}/\d{2}/\d{4}"
        maxLength={10}
        autoComplete="off"
        title="Enter your date of birth as DD/MM/YYYY"
        aria-label="Date of birth, day slash month slash year"
        value={display}
        id={id}
        className={className}
        onChange={(e) => setDisplay(formatDisplayDob(e.target.value))}
        {...rest}
      />
      <input type="hidden" name={name} value={iso} />
    </>
  );
}
