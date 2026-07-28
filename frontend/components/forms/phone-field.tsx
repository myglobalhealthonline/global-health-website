"use client";

import { useId, useMemo, useState } from "react";
import { CountryDialSelect } from "@/components/forms/country-dial-select";
import { combinePhone, DEFAULT_DIAL, splitPhone } from "@/lib/phone/dial-codes";

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
  className = "gh-phone-field flex gap-2",
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

  return (
    <div className={className}>
      <input type="hidden" name={name} value={combined} />
      {/* Searchable picker over every country — a saved number with a code
          outside the list still round-trips: the trigger shows "+<dial>" as
          parsed, it just has no flag until the user picks a country. */}
      <CountryDialSelect
        value={dial}
        disabled={disabled}
        className={`gh-phone-field__dial ${selectClassName} max-w-[150px]`}
        onChange={(next) => update(next, national)}
      />
      <input
        id={inputId}
        type="tel"
        inputMode="tel"
        autoComplete="tel-national"
        className={`gh-phone-field__number ${inputClassName} flex-1`}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        aria-invalid={ariaInvalid}
        value={national}
        // National number only — strip non-digits and cap at 14 (E.164 allows
        // up to 15 digits total including the dial code).
        maxLength={14}
        onChange={(e) => update(dial, e.target.value.replace(/\D/g, "").slice(0, 14))}
      />
    </div>
  );
}
