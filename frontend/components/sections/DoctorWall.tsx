"use client";

/**
 * Doctor wall — dark forest section with optional country filter chips.
 *
 * Data-driven: callers pass `doctors`. The earlier version hard-coded 8 fake
 * doctors and faked an availability state. Both removed — this component now
 * only shows real Doctor rows from the DB.
 *
 * UX rules:
 *   • When all doctors share one country, filter chips are hidden.
 *   • If `doctors` is empty, the section returns `null`.
 *   • The "Book with …" link uses `bookHref` from the caller (lang-aware).
 */

import { useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export type DoctorWallItem = {
  /** Stable id (e.g. Doctor.id). Used for React keys. */
  id: string;
  /** Initials, 1–3 chars. Caller computes from fullName if needed. */
  initials: string;
  name: string;
  role: string;
  /** Country code (`ie | pt | sp | cz | rm`). */
  country: string;
  /** Free-text language list (e.g. "PT · EN"). Pass empty string to omit. */
  langs: string;
  /** Profile href. The button text appends the last name. */
  href: string;
};

const FLAG_CLASS: Record<string, string> = {
  ie: "fi fi-ie",
  pt: "fi fi-pt",
  sp: "fi fi-es",
  cz: "fi fi-cz",
  rm: "fi fi-ro",
};

const PATTERN_DARK =
  "url(\"data:image/svg+xml,%3Csvg width='28' height='28' viewBox='0 0 28 28' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' stroke='%23ffffff' stroke-width='2' stroke-linecap='round'%3E%3Cpath d='M14 9v10M9 14h10'/%3E%3C/g%3E%3C/svg%3E\")";

const FILTER_LABELS: Record<string, string> = {
  ie: "Ireland",
  pt: "Portugal",
  sp: "Spain",
  cz: "Czechia",
  rm: "Romania",
};

export function DoctorWall({
  doctors,
  bookHref,
}: {
  doctors: DoctorWallItem[];
  /** Optional fallback when a doctor card has no `href`. */
  bookHref?: string;
}) {
  // Compute country buckets from the actual data, in source order.
  const countriesInData = Array.from(new Set(doctors.map((d) => d.country)));
  const filterOptions: { id: string; label: string }[] = [
    { id: "all", label: "All" },
    ...countriesInData.map((code) => ({
      id: code,
      label: FILTER_LABELS[code] ?? code.toUpperCase(),
    })),
  ];

  const [filter, setFilter] = useState<string>("all");
  const shown =
    filter === "all" ? doctors : doctors.filter((d) => d.country === filter);

  if (doctors.length === 0) return null;

  const showFilters = countriesInData.length > 1;

  return (
    <section
      className="relative overflow-hidden text-white"
      style={{
        padding: "96px 0",
        background: "var(--color-background-dark)",
      }}
    >
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          opacity: 0.04,
          backgroundImage: PATTERN_DARK,
          backgroundSize: "28px",
        }}
      />

      <div
        className="relative mx-auto"
        style={{
          maxWidth: 1320,
          padding: "0 clamp(20px, 4vw, 40px)",
        }}
      >
        <div
          className="flex flex-wrap items-end justify-between gap-6"
          style={{ marginBottom: 32 }}
        >
          <div>
            <span
              className="uppercase"
              style={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.18em",
                color: "var(--color-accent)",
              }}
            >
              The team
            </span>
            <h2
              className="text-white"
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "clamp(32px, 4vw, 48px)",
                fontWeight: 800,
                letterSpacing: "-0.02em",
                lineHeight: 1.1,
                margin: "12px 0 0",
                maxWidth: "16ch",
              }}
            >
              Real doctors. Registered locally.
            </h2>
          </div>
          <p
            className="m-0"
            style={{
              color: "rgba(255,255,255,0.65)",
              maxWidth: "32ch",
              fontSize: 16,
            }}
          >
            Every consultation is with someone licensed where you are.
          </p>
        </div>

        {showFilters ? (
          <div
            className="flex flex-wrap gap-2"
            style={{ marginBottom: 28 }}
          >
            {filterOptions.map((f) => {
              const isActive = filter === f.id;
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFilter(f.id)}
                  className="inline-flex items-center gap-2"
                  style={{
                    padding: "8px 16px",
                    borderRadius: 999,
                    border:
                      "1px solid " +
                      (isActive
                        ? "var(--color-accent)"
                        : "rgba(255,255,255,0.20)"),
                    background: isActive ? "var(--color-accent)" : "transparent",
                    color: isActive
                      ? "var(--color-background-dark)"
                      : "rgba(255,255,255,0.85)",
                    fontFamily: "inherit",
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  {f.id !== "all" ? (
                    <span
                      aria-hidden
                      className={`${FLAG_CLASS[f.id] ?? ""} inline-block`}
                      style={{
                        width: 18,
                        height: 13,
                        borderRadius: 2,
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                      }}
                    />
                  ) : null}
                  {f.label}
                </button>
              );
            })}
          </div>
        ) : null}

        <div
          className="grid gap-4"
          style={{
            gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
          }}
        >
          {shown.map((d) => {
            const lastName = d.name.includes(" ")
              ? d.name.split(" ").slice(-1)[0]
              : d.name;
            const href = d.href || bookHref || "/book-online";
            return (
              <div
                key={d.id}
                style={{
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.10)",
                  borderRadius: 20,
                  padding: 20,
                }}
              >
                <div
                  className="flex items-center gap-3.5"
                  style={{ marginBottom: 16 }}
                >
                  <span
                    className="inline-flex shrink-0 items-center justify-center"
                    style={{
                      width: 56,
                      height: 56,
                      borderRadius: 16,
                      background:
                        "linear-gradient(135deg, var(--color-accent), var(--color-brand-primary))",
                      color: "var(--color-background-dark)",
                      fontFamily: "var(--font-display)",
                      fontSize: 18,
                      fontWeight: 800,
                    }}
                  >
                    {d.initials}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p
                      className="m-0 truncate text-white"
                      style={{ fontSize: 15, fontWeight: 700 }}
                    >
                      {d.name}
                    </p>
                    <p
                      className="m-0"
                      style={{
                        fontSize: 12,
                        color: "rgba(255,255,255,0.60)",
                      }}
                    >
                      {d.role}
                    </p>
                  </div>
                </div>

                <div
                  className="grid grid-cols-2 gap-1"
                  style={{
                    marginBottom: 14,
                    paddingBottom: 14,
                    borderBottom: "1px solid rgba(255,255,255,0.10)",
                  }}
                >
                  <DKV
                    k="Country"
                    v={
                      <span className="inline-flex items-center gap-1.5">
                        <span
                          aria-hidden
                          className={`${FLAG_CLASS[d.country] ?? ""} inline-block`}
                          style={{
                            width: 18,
                            height: 13,
                            borderRadius: 2,
                            backgroundSize: "cover",
                            backgroundPosition: "center",
                          }}
                        />
                        {d.country.toUpperCase()}
                      </span>
                    }
                  />
                  <DKV k="Languages" v={d.langs || "—"} />
                </div>

                <Link
                  href={href}
                  className="inline-flex w-full items-center justify-center gap-1.5 text-white"
                  style={{
                    padding: "10px 14px",
                    borderRadius: 999,
                    background: "rgba(255,255,255,0.10)",
                    border: "1px solid rgba(255,255,255,0.16)",
                    fontFamily: "inherit",
                    fontSize: 13,
                    fontWeight: 700,
                    textDecoration: "none",
                  }}
                >
                  Book with {lastName} <ArrowRight className="size-3.5" aria-hidden />
                </Link>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function DKV({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div>
      <p
        className="m-0 uppercase"
        style={{
          fontSize: 10,
          color: "rgba(255,255,255,0.50)",
          letterSpacing: "0.06em",
          fontWeight: 700,
        }}
      >
        {k}
      </p>
      <p
        className="m-0 text-white"
        style={{ marginTop: 2, fontSize: 13, fontWeight: 600 }}
      >
        {v}
      </p>
    </div>
  );
}
