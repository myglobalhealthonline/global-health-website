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
 *   • The "View profile" link uses `href` from the caller (lang-aware) —
 *     points at the doctor's profile page where the visitor picks a service.
 */

import { useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Flag } from "@/components/ui/Flag";

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
  /** Optional uploaded portrait. When provided, replaces the initials tile. */
  imageSrc?: string | null;
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
      className="relative overflow-hidden text-white gh-section"
      style={{
        background: `
          radial-gradient(ellipse 1100px 700px at 110% 0%, rgba(176, 241, 34, 0.10), transparent 55%),
          linear-gradient(180deg, #061914 0%, var(--color-background-dark) 50%, #061914 100%)
        `,
      }}
    >
      {/* Pattern overlay — same forest-night dotted texture as before
        * but cranked slightly so the section reads as a different
        * surface from the marquee/hero above. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.05]"
        style={{
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
        {/* Magazine-style title — Cormorant italic accent inside a big
          * sans display headline. Plus a number column that surfaces
          * the actual roster size as a visual element. */}
        <div className="grid items-end gap-10 lg:grid-cols-[1.5fr_auto] mb-12 md:mb-16">
          <div>
            <span className="gh-eyebrow text-[var(--color-accent)]" style={{ letterSpacing: "0.18em" }}>
              The team
            </span>
            <h2
              className="
                mt-3 max-w-[16ch]
                font-semibold tracking-[-0.03em] leading-[1.02]
                text-white
                text-[clamp(2.5rem,5vw+0.5rem,4.5rem)]
              "
            >
              Doctors who actually{" "}
              <span className="font-extrabold text-[var(--color-brand-accent)]">
                pick up
              </span>
              .
            </h2>
            <p className="mt-5 max-w-[44ch] text-base text-white/65">
              Every consultation is with someone licensed where you are. No
              call centres, no rota of strangers — the doctor on screen is
              the doctor on the profile.
            </p>
          </div>
          <div className="text-right">
            <p
              className="
                font-semibold leading-none tracking-[-0.03em]
                text-[var(--color-accent)]
                [font-variant-numeric:tabular-nums]
                text-[clamp(4.5rem,9vw,8rem)]
              "
            >
              {shown.length}
            </p>
            <p className="mt-3 text-xs uppercase tracking-[0.16em] text-white/55">
              Registered clinicians
            </p>
          </div>
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
                  {f.id !== "all" ? <Flag code={f.id} size="sm" /> : null}
                  {f.label}
                </button>
              );
            })}
          </div>
        ) : null}

        {/* Editorial doctor grid — portrait dominates, metadata is
          * a quiet caption underneath. The portrait is the protagonist
          * because faces are what makes "telemedicine" feel real. */}
        <div
          className="grid gap-5"
          style={{
            gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
          }}
        >
          {shown.map((d) => {
            // `d.href` is the per-card link (typically the country-scoped
            // doctor profile URL injected by the page that renders this
            // wall). `bookHref` is the wall-level fallback.
            const href = d.href || bookHref || "/";
            return (
              <Link
                key={d.id}
                href={href}
                className="
                  gh-doctor-card group block overflow-hidden
                  rounded-[var(--radius-card)]
                  border border-white/10
                  bg-white/[0.03]
                  transition-[transform,background-color,border-color] duration-300
                  ease-[cubic-bezier(0.16,1,0.3,1)]
                  hover:-translate-y-1 hover:bg-white/[0.06] hover:border-white/20
                  motion-reduce:transition-none motion-reduce:hover:translate-y-0
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]
                "
                style={{ textDecoration: "none" }}
              >
                {/* Portrait — fills the top of the card. Aspect ratio
                  * 3:4 (portrait) so faces don't get cropped weird at
                  * different card widths. Falls back to a gradient
                  * initials tile when no photo. */}
                <div className="relative aspect-[3/4] w-full overflow-hidden bg-white/5">
                  {d.imageSrc ? (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={d.imageSrc}
                        alt={d.name}
                        className="h-full w-full object-cover object-top"
                      />
                      {/* Bottom gradient scrim so name + flag overlay
                        * stays legible regardless of the portrait. */}
                      <div
                        aria-hidden
                        className="pointer-events-none absolute inset-0"
                        style={{
                          background:
                            "linear-gradient(180deg, transparent 50%, rgba(15,46,37,0.75) 100%)",
                        }}
                      />
                    </>
                  ) : (
                    <div
                      className="flex h-full w-full items-center justify-center text-[clamp(48px,8vw,80px)] font-bold tracking-tight text-[var(--color-background-dark)]"
                      style={{
                        background:
                          "linear-gradient(135deg, var(--color-accent), var(--color-brand-primary))",
                        fontFamily: "var(--font-display)",
                      }}
                    >
                      {d.initials}
                    </div>
                  )}
                  {/* Floating country flag — bottom-left over the
                    * portrait scrim. Replaces the "Country: XX" metadata
                    * row, which read as form fields. */}
                  <span className="absolute left-4 bottom-4 inline-flex items-center gap-2 rounded-full bg-black/40 px-2.5 py-1 backdrop-blur-sm">
                    <Flag code={d.country} size="sm" />
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-white">
                      {d.country.toUpperCase()}
                    </span>
                  </span>
                </div>

                {/* Caption — name + title + languages + arrow. Single
                  * column, tight rhythm. */}
                <div className="p-5">
                  <p className="text-base font-semibold leading-tight text-white">
                    {d.name}
                  </p>
                  <p className="mt-1 text-xs text-white/60">
                    {d.role}
                  </p>
                  {d.langs ? (
                    <p className="mt-3 text-[11px] uppercase tracking-[0.12em] text-white/45">
                      {d.langs}
                    </p>
                  ) : null}

                  <span
                    className="
                      mt-4 inline-flex items-center gap-1.5
                      text-[var(--color-accent)] text-sm font-semibold
                      transition-transform duration-200
                      group-hover:translate-x-0.5
                      motion-reduce:group-hover:translate-x-0
                    "
                  >
                    View profile
                    <ArrowRight className="size-3.5" strokeWidth={1.5} aria-hidden />
                  </span>
                </div>
              </Link>
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
