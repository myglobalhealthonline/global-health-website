"use client";

import { useId, useMemo, useState } from "react";
import {
  combinePhone,
  DEFAULT_DIAL,
  DIAL_OPTIONS,
  splitPhone,
} from "@/lib/phone/dial-codes";

type Props = {
  /** Hidden-input name so plain (FormData) forms pick up the combined value. */
  name?: string;
  /** Existing phone to prefill (parsed into dial + national). */
  defaultValue?: string | null;
  /** Initial dial code (digits, no +) when defaultValue has no country code. */
  defaultDial?: string;
  /** Controlled forms: receives the combined "+<dial> <national>" string
   *  (empty string when the national number is blank). */
  onChange?: (value: string) => void;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
  /** Class for the national-number input (defaults to the admin gh-input). */
  inputClassName?: string;
  /** Class for the dial-code select (defaults to the admin gh-select). */
  selectClassName?: string;
  /** Wrapper class. */
  className?: string;
  id?: string;
  "aria-invalid"?: boolean;
};

/**
 * Country-code + national-number phone input, reused across every phone field
 * (public booking, checkout, register, account profile, admin editors…).
 *
 * Renders a dial-code `<select>` + national `<input>` and keeps a hidden
 * `<input name>` synced to `"+<dial> <national>"` so uncontrolled FormData
 * forms get the full international number with zero extra wiring. Controlled
 * forms can additionally pass `onChange` to mirror the value into state.
 *
 * Empty national number → hidden value is "" (preserves "optional phone"
 * semantics: a blank field submits blank, not a bare "+353").
 */
export function PhoneField({
  name = "phone",
  defaultValue,
  defaultDial,
  onChange,
  required = false,
  disabled = false,
  placeholder = "871234567",
  inputClassName = "gh-input",
  selectClassName = "gh-select",
  className = "flex gap-2",
  id,
  "aria-invalid": ariaInvalid,
}: Props) {
  const reactId = useId();
  const inputId = id ?? `phone-${reactId}`;
  const initial = useMemo(
    () => splitPhone(defaultValue ?? "", defaultDial ?? DEFAULT_DIAL),
    // Parse once at mount; callers that prefill async should gate render or
    // pass a `key` to remount with the loaded value.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  const [dial, setDial] = useState(initial.dial);
  const [national, setNational] = useState(initial.national);

  const combined = combinePhone(dial, national);

  function update(nextDial: string, nextNational: string) {
    setDial(nextDial);
    setNational(nextNational);
    onChange?.(combinePhone(nextDial, nextNational));
  }

  // If the parsed dial isn't one of the offered options (e.g. a saved number
  // with an exotic code), surface it as an extra option so it round-trips.
  const options = DIAL_OPTIONS.some((o) => o.dial === dial)
    ? DIAL_OPTIONS
    : [{ key: dial, dial, label: `+${dial}` }, ...DIAL_OPTIONS];

  return (
    <div className={className}>
      <input type="hidden" name={name} value={combined} />
      <select
        aria-label="Country code"
        className={`${selectClassName} max-w-[150px]`}
        value={dial}
        disabled={disabled}
        onChange={(e) => update(e.target.value, national)}
      >
        {options.map((o) => (
          <option key={o.key} value={o.dial}>
            {o.label} (+{o.dial})
          </option>
        ))}
      </select>
      <input
        id={inputId}
        type="tel"
        inputMode="tel"
        autoComplete="tel-national"
        className={`${inputClassName} flex-1`}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        aria-invalid={ariaInvalid}
        value={national}
        onChange={(e) => update(dial, e.target.value)}
      />
    </div>
  );
}
