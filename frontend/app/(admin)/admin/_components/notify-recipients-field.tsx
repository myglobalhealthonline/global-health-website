"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";

/**
 * Repeatable recipient input (emails or WhatsApp numbers). Renders one row per
 * entry with add/remove, and mirrors the current values into a hidden input
 * (newline-joined) named `name` so the server action reads them exactly like a
 * textarea. Lets an admin add more than one recipient without free-typing lines.
 */
export function NotifyRecipientsField({
  name,
  label,
  placeholder,
  initial,
  type = "text",
  inputMode,
}: {
  name: string;
  label: string;
  placeholder: string;
  initial: string[];
  type?: "text" | "email" | "tel";
  inputMode?: "email" | "tel";
}) {
  // Always keep at least one (empty) row so the admin can type into it.
  const [rows, setRows] = useState<string[]>(initial.length > 0 ? initial : [""]);

  function update(i: number, value: string) {
    setRows((prev) => prev.map((r, idx) => (idx === i ? value : r)));
  }
  function add() {
    setRows((prev) => [...prev, ""]);
  }
  function remove(i: number) {
    setRows((prev) => {
      const next = prev.filter((_, idx) => idx !== i);
      return next.length > 0 ? next : [""];
    });
  }

  return (
    <div className="flex flex-col gap-1.5">
      <span className="gh-field-label">{label}</span>
      {/* Server action reads this hidden value (splits on newline/comma). */}
      <input type="hidden" name={name} value={rows.filter((r) => r.trim()).join("\n")} readOnly />
      <div className="flex flex-col gap-2">
        {rows.map((value, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              type={type}
              inputMode={inputMode}
              value={value}
              onChange={(e) => update(i, e.target.value)}
              placeholder={placeholder}
              className="gh-input flex-1"
            />
            <button
              type="button"
              onClick={() => remove(i)}
              className="gh-btn gh-btn-soft flex size-8 items-center justify-center p-0"
              aria-label="Remove recipient"
            >
              <X className="size-3.5" aria-hidden />
            </button>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={add}
        className="mt-1 inline-flex w-fit items-center gap-1 text-[12px] font-semibold"
        style={{ color: "var(--color-brand-primary)" }}
      >
        <Plus className="size-3.5" aria-hidden /> Add another
      </button>
    </div>
  );
}
