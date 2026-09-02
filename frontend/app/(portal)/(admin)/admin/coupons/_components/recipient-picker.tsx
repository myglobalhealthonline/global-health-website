"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, X } from "lucide-react";
import { IconBtn, Pill } from "../../_components/atoms";

export type RecipientChip = {
  email: string;
  fullName: string | null;
  locale: string | null;
  /**
   * Picked from the autocomplete rather than typed. A UI badge only — the
   * lookup returns no profile id (it merges Appointment and PatientProfile
   * rows by address), so this is deliberately NOT submitted.
   */
  known: boolean;
};

type PatientOption = {
  email: string;
  fullName: string;
  appointmentCount: number;
};

const LOCALES = ["EN", "PT", "ES", "CS", "RO", "DE"] as const;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * One control for both ways of naming a recipient: pick an existing customer
 * from the debounced email autocomplete, or type an address nobody has booked
 * with yet. Both end up as chips in the same list.
 *
 * The chips are serialised into a single hidden input so the page keeps the
 * portal's native `<form action={serverAction}>` + FormData convention — no
 * react-hook-form, no client-side submit fetch.
 *
 * The lookup reuses `/api/admin/patients/by-email`, which is the same endpoint
 * and the same debounce+AbortController shape as the manual-booking form.
 */
export function RecipientPicker({
  name = "recipients",
  max,
  label = "Recipients",
  hint,
}: {
  name?: string;
  /** 1 for a personal coupon, unset for a general one. */
  max?: number;
  label?: string;
  hint?: string;
}) {
  const [chips, setChips] = useState<RecipientChip[]>([]);
  const [query, setQuery] = useState("");
  const [options, setOptions] = useState<PatientOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const atMax = max != null && chips.length >= max;

  useEffect(() => {
    const value = query.trim();
    const controller = new AbortController();
    const timer = setTimeout(() => {
      if (value.length < 2) {
        setOptions([]);
        setLoading(false);
        return;
      }
      void (async () => {
        setLoading(true);
        try {
          const res = await fetch(
            `/api/admin/patients/by-email?email=${encodeURIComponent(value)}`,
            { signal: controller.signal },
          );
          const json = (await res.json()) as { ok?: boolean; data?: { patients?: PatientOption[] } };
          if (controller.signal.aborted) return;
          setOptions(res.ok && json.ok && Array.isArray(json.data?.patients) ? json.data!.patients! : []);
        } catch {
          if (!controller.signal.aborted) setOptions([]);
        } finally {
          if (!controller.signal.aborted) setLoading(false);
        }
      })();
    }, 250);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  function add(chip: RecipientChip) {
    const email = chip.email.trim().toLowerCase();
    if (!EMAIL_RE.test(email)) {
      setError("That does not look like an email address.");
      return;
    }
    if (chips.some((c) => c.email === email)) {
      // Blocked here and again by the `@@unique([couponId, email])` constraint,
      // so a duplicate can never turn into a duplicate email.
      setError("That address is already on the list.");
      return;
    }
    if (atMax) return;
    setChips((prev) => [...prev, { ...chip, email }]);
    setQuery("");
    setOptions([]);
    setError(null);
  }

  function addTyped() {
    const value = query.trim();
    if (!value) return;
    add({ email: value, fullName: null, locale: null, known: false });
  }

  return (
    <div className="gh-admin-recipient-picker">
      <input
        type="hidden"
        name={name}
        // `known` is stripped: it is a badge, not data the server accepts.
        value={JSON.stringify(
          chips.map(({ email, fullName, locale }) => ({ email, fullName, locale })),
        )}
        readOnly
      />

      <label htmlFor={`${name}-input`}>
        <span className="gh-field-label">{label}</span>
      </label>
      {hint ? (
        <p className="mb-1.5 text-portal-meta text-[var(--color-text-muted)]">{hint}</p>
      ) : null}

      <div className="relative">
        <input
          id={`${name}-input`}
          className="gh-input"
          type="text"
          autoComplete="off"
          value={query}
          disabled={atMax}
          placeholder={atMax ? "Recipient added" : "Search existing customers, or type any email"}
          onChange={(e) => {
            setQuery(e.target.value);
            setMenuOpen(true);
            if (error) setError(null);
          }}
          onFocus={() => setMenuOpen(true)}
          // A click on a suggestion must land before the menu closes.
          onBlur={() => setTimeout(() => setMenuOpen(false), 120)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              addTyped();
            }
          }}
        />
        {menuOpen && !atMax && (loading || options.length > 0) ? (
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
                  add
                </p>
                {options.map((p, i) => (
                  <button
                    key={`${p.email}-${i}`}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() =>
                      add({
                        email: p.email,
                        fullName: p.fullName || null,
                        locale: null,
                        known: true,
                      })
                    }
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
      </div>

      {error ? (
        <p role="alert" className="mt-1.5 text-portal-meta text-[var(--portal-danger-text)]">
          {error}
        </p>
      ) : null}

      {!atMax ? (
        <p className="mt-1.5 text-portal-meta text-[var(--color-text-muted)]">
          Press Enter to add an address that is not in the list yet.
        </p>
      ) : null}

      {chips.length > 0 ? (
        <ul className="mt-3 flex flex-wrap gap-2">
          {chips.map((chip) => (
            <li
              key={chip.email}
              className="flex items-center gap-2 rounded-[var(--radius-card-sm)] border border-[var(--color-border)] px-2 py-1.5"
            >
              <Pill tone={chip.known ? "brand" : "neutral"}>
                {chip.known ? "Customer" : "New"}
              </Pill>
              <span className="text-portal-body">
                {chip.fullName ? `${chip.fullName} · ` : ""}
                {chip.email}
              </span>
              <select
                className="gh-select"
                style={{ width: "auto", padding: "2px 6px", fontSize: 12 }}
                value={chip.locale ?? ""}
                aria-label={`Language for ${chip.email}`}
                onChange={(e) =>
                  setChips((prev) =>
                    prev.map((c) =>
                      c.email === chip.email ? { ...c, locale: e.target.value || null } : c,
                    ),
                  )
                }
              >
                {/* Auto = resolve at send time from their account, their
                    country, then English. */}
                <option value="">Auto</option>
                {LOCALES.map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </select>
              <IconBtn
                ariaLabel={`Remove ${chip.email}`}
                onClick={() => {
                  setChips((prev) => prev.filter((c) => c.email !== chip.email));
                  inputRef.current?.focus();
                }}
              >
                <X className="size-4" />
              </IconBtn>
            </li>
          ))}
        </ul>
      ) : null}

      {chips.length > 20 ? (
        <p className="mt-2 text-portal-meta text-[var(--portal-warning-text)]">
          {chips.length} recipients. Outbound mail is capped at 100 per day — larger blasts have to
          be split across days.
        </p>
      ) : null}
    </div>
  );
}
