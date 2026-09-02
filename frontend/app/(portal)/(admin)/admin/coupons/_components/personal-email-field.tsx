"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { usePatientLookup } from "./use-patient-lookup";

/**
 * The assigned person on a PERSONAL coupon: email plus optional name, with the
 * same existing-customer typeahead the manual-booking form uses. Picking a
 * suggestion prefills both fields, so a coupon minted for a returning patient
 * is locked to the address they actually book with rather than a typo of it.
 *
 * Still plain `name=` inputs underneath, so the page keeps its native
 * `<form action={serverAction}>` + FormData convention.
 */
export function PersonalEmailField() {
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [picked, setPicked] = useState<string | null>(null);
  const { options, loading } = usePatientLookup(email);

  // Hide the menu once the typed value IS the chosen address — otherwise the
  // dropdown reopens over the field the moment focus returns.
  const showMenu = menuOpen && picked !== email.trim().toLowerCase();

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <label className="relative">
        <span className="gh-field-label">Their email</span>
        <input
          className="gh-input"
          name="personalEmail"
          type="email"
          autoComplete="off"
          required
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setMenuOpen(true);
            setPicked(null);
          }}
          onFocus={() => setMenuOpen(true)}
          // A click on a suggestion must land before the menu closes.
          onBlur={() => setTimeout(() => setMenuOpen(false), 120)}
        />
        {showMenu && (loading || options.length > 0) ? (
          <div className="gh-admin-manual-patient-menu absolute left-0 right-0 top-[calc(100%+4px)] z-[var(--z-dropdown)] max-h-64 overflow-auto rounded-[var(--radius-card-sm)] border border-[var(--color-border)] bg-[var(--color-background-page)] shadow-lg">
            {loading ? (
              <div className="flex items-center gap-2 px-3 py-2 text-portal-meta text-[var(--color-text-muted)]">
                <Loader2 className="size-3.5 animate-spin" aria-hidden /> Searching existing
                customers…
              </div>
            ) : (
              <>
                <p className="border-b border-[var(--color-border)] px-3 py-1.5 text-portal-thead font-semibold uppercase tracking-[0.08em] text-[var(--color-text-muted)]">
                  {options.length} matching customer{options.length === 1 ? "" : "s"} — pick one to
                  prefill
                </p>
                {options.map((p, i) => (
                  <button
                    key={`${p.email}-${i}`}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      setEmail(p.email);
                      setPicked(p.email.toLowerCase());
                      if (p.fullName) setFullName(p.fullName);
                      setMenuOpen(false);
                    }}
                    className="block w-full px-3 py-2 text-left text-portal-body hover:bg-[var(--portal-well)]"
                  >
                    <strong>{p.fullName || p.email}</strong>
                    <small className="block text-[var(--color-text-muted)]">
                      {p.email} · {p.appointmentCount} booking
                      {p.appointmentCount === 1 ? "" : "s"}
                    </small>
                  </button>
                ))}
              </>
            )}
          </div>
        ) : null}
        <small className="mt-1 block text-[var(--color-text-muted)]">
          The booking must be paid for from this address, or the code is refused.
        </small>
      </label>

      <label>
        <span className="gh-field-label">Their name (optional)</span>
        <input
          className="gh-input"
          name="personalName"
          type="text"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
        />
        <small className="mt-1 block text-[var(--color-text-muted)]">
          Used for the greeting in the email.
        </small>
      </label>
    </div>
  );
}
