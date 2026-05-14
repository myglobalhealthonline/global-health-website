"use client";

/**
 * Doctor wall — dark forest section with filterable doctor cards.
 *
 * Mirrors `ui_kits/website/Sections.jsx DoctorWall`:
 *   • Forest-dark background with medical-pattern overlay
 *   • Header — mint eyebrow + h2 + side description
 *   • Country filter chips with flag icons
 *   • Doctor cards: 56px gradient initials circle + name + role,
 *     KV grid (Country/Experience/Languages/Available),
 *     "Book with..." button
 */

import { useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

type Doctor = {
  initials: string;
  name: string;
  role: string;
  country: "ie" | "pt" | "sp" | "cz" | "rm";
  langs: string;
  avail: "today" | "tomorrow";
  yrs: number;
};

const DOCTORS: Doctor[] = [
  { initials: "IC", name: "Dr. Inês Carvalho", role: "GP", country: "pt", langs: "PT · EN", avail: "today", yrs: 12 },
  { initials: "TM", name: "Dr. Tiago Mendes", role: "Cardiologist", country: "pt", langs: "PT · ES · EN", avail: "today", yrs: 18 },
  { initials: "SW", name: "Dr. Siobhán Walsh", role: "GP", country: "ie", langs: "EN", avail: "today", yrs: 7 },
  { initials: "MR", name: "Dr. María Rojas", role: "Dermatologist", country: "sp", langs: "ES · PT · EN", avail: "tomorrow", yrs: 14 },
  { initials: "TN", name: "Dr. Tomáš Novák", role: "GP", country: "cz", langs: "CS · EN", avail: "today", yrs: 9 },
  { initials: "AP", name: "Dr. Ana Popescu", role: "Psychiatrist", country: "rm", langs: "RO · EN", avail: "today", yrs: 11 },
  { initials: "JF", name: "Dr. James Foley", role: "GP", country: "ie", langs: "EN · GA", avail: "today", yrs: 5 },
  { initials: "LS", name: "Dr. Lara Santos", role: "Endocrinologist", country: "pt", langs: "PT · EN", avail: "tomorrow", yrs: 16 },
];

const FILTERS = [
  { id: "all", label: "All" },
  { id: "ie", label: "Ireland" },
  { id: "pt", label: "Portugal" },
  { id: "sp", label: "Spain" },
  { id: "cz", label: "Czechia" },
  { id: "rm", label: "Romania" },
] as const;

const FLAG_CLASS: Record<string, string> = {
  ie: "fi fi-ie",
  pt: "fi fi-pt",
  sp: "fi fi-es",
  cz: "fi fi-cz",
  rm: "fi fi-ro",
};

const PATTERN_DARK =
  "url(\"data:image/svg+xml,%3Csvg width='28' height='28' viewBox='0 0 28 28' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' stroke='%23ffffff' stroke-width='2' stroke-linecap='round'%3E%3Cpath d='M14 9v10M9 14h10'/%3E%3C/g%3E%3C/svg%3E\")";

type FilterId = (typeof FILTERS)[number]["id"];

export function DoctorWall() {
  const [filter, setFilter] = useState<FilterId>("all");
  const shown =
    filter === "all" ? DOCTORS : DOCTORS.filter((d) => d.country === filter);

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
        {/* Header */}
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
            Pick a doctor by country, specialty, or language. We don&apos;t
            outsource — every consultation is with someone licensed where you are.
          </p>
        </div>

        {/* Filter chips */}
        <div
          className="flex flex-wrap gap-2"
          style={{ marginBottom: 28 }}
        >
          {FILTERS.map((f) => {
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

        {/* Doctor grid */}
        <div
          className="grid gap-4"
          style={{
            gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
          }}
        >
          {shown.map((d) => (
            <div
              key={d.name}
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
                <DKV k="Experience" v={`${d.yrs} yrs`} />
                <DKV k="Languages" v={d.langs} />
                <DKV
                  k="Available"
                  v={
                    <span
                      className="inline-flex items-center gap-1.5 capitalize"
                      style={{
                        color:
                          d.avail === "today"
                            ? "var(--color-accent)"
                            : "rgba(255,255,255,0.70)",
                        fontWeight: 700,
                        fontSize: 12,
                      }}
                    >
                      <span
                        aria-hidden
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: 999,
                          background:
                            d.avail === "today"
                              ? "#16A34A"
                              : "rgba(255,255,255,0.40)",
                        }}
                      />
                      {d.avail}
                    </span>
                  }
                />
              </div>

              <Link
                href="/book-online"
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
                Book with {d.name.split(" ")[1]}{" "}
                <ArrowRight className="size-3.5" aria-hidden />
              </Link>
            </div>
          ))}
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
