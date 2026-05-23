"use client";

/**
 * Doctor wall — light luxury version.
 * Soft white surface, white doctor cards with elevated hover, forest accents.
 */

import { useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Flag } from "@/components/ui/Flag";

export type DoctorWallItem = {
  id: string;
  initials: string;
  name: string;
  role: string;
  country: string;
  langs: string;
  href: string;
  imageSrc?: string | null;
  imcRegistration?: string;
};

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
  bookHref?: string;
}) {
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
    <section className="relative gh-section bg-[var(--color-background-soft)]">
      <div
        className="relative mx-auto px-5 md:px-10"
        style={{ maxWidth: "var(--container-width)" }}
      >
        {/* Section header */}
        <div className="grid items-end gap-8 lg:grid-cols-[1.5fr_auto] mb-12 md:mb-16">
          <div>
            <span className="gh-eyebrow text-[var(--color-brand-primary)]">
              The team
            </span>
            <h2
              className="mt-3 max-w-[18ch] font-extrabold tracking-[-0.03em] leading-[1.02] text-[var(--color-text-primary)]"
              style={{ fontSize: "clamp(2rem,4vw+0.5rem,3.5rem)" }}
            >
              Doctors who actually{" "}
              <span className="text-[var(--color-brand-primary)]">pick up.</span>
            </h2>
            <p className="mt-5 max-w-[48ch] text-[length:var(--text-body-lg)] text-[var(--color-text-body)] leading-relaxed">
              Every consultation is with someone licensed where you are. No
              call centres, no rota of strangers — the doctor on screen is
              the doctor on the profile.
            </p>
          </div>

          {/* Doctor count */}
          <div className="text-right">
            <p
              className="font-extrabold leading-none tracking-[-0.04em] text-[var(--color-brand-primary)] [font-variant-numeric:tabular-nums]"
              style={{ fontSize: "var(--text-display)" }}
            >
              {shown.length}
            </p>
            <p className="mt-2 gh-eyebrow text-[var(--color-text-muted)]">
              Registered clinicians
            </p>
          </div>
        </div>

        {/* Filter chips */}
        {showFilters ? (
          <div className="flex flex-wrap gap-2 mb-8">
            {filterOptions.map((f) => {
              const isActive = filter === f.id;
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFilter(f.id)}
                  className={`
                    inline-flex items-center gap-2
                    rounded-full px-4 py-2
                    text-[length:var(--text-meta)] font-semibold
                    border
                    transition-[background-color,border-color,color] duration-200
                    motion-reduce:transition-none
                    ${isActive
                      ? "bg-[var(--color-brand-primary)] border-[var(--color-brand-primary)] text-white"
                      : "bg-white border-[var(--color-border)] text-[var(--color-text-body)] hover:bg-[var(--color-background-soft)] hover:border-[var(--color-border-strong)]"
                    }
                  `}
                >
                  {f.id !== "all" ? <Flag code={f.id} size="sm" /> : null}
                  {f.label}
                </button>
              );
            })}
          </div>
        ) : null}

        {/* Doctor card grid */}
        <div
          className="grid gap-5"
          style={{ gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))" }}
        >
          {shown.map((d) => {
            const href = d.href || bookHref || "/";
            return (
              <Link
                key={d.id}
                href={href}
                className="
                  group block overflow-hidden
                  rounded-[var(--radius-card)]
                  border border-[var(--color-border)]
                  bg-[var(--color-background-page)]
                  transition-[transform,box-shadow,border-color] duration-300
                  ease-[cubic-bezier(0.16,1,0.3,1)]
                  hover:-translate-y-0.5
                  hover:shadow-[var(--shadow-card-hover)]
                  hover:border-[var(--color-border-strong)]
                  motion-reduce:transition-none motion-reduce:hover:translate-y-0
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-primary)]/30
                "
                style={{ textDecoration: "none" }}
              >
                {/* Portrait */}
                <div className="relative aspect-[3/4] w-full overflow-hidden bg-[var(--color-background-panel)]">
                  {d.imageSrc ? (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={d.imageSrc}
                        alt={d.name}
                        className="h-full w-full object-cover object-top"
                      />
                      <div
                        aria-hidden
                        className="pointer-events-none absolute inset-0"
                        style={{
                          background:
                            "linear-gradient(180deg, transparent 55%, rgba(15,46,37,0.65) 100%)",
                        }}
                      />
                    </>
                  ) : (
                    <div
                      className="flex h-full w-full items-center justify-center font-bold tracking-tight text-white bg-[var(--color-brand-primary)]"
                      style={{ fontSize: "clamp(48px,8vw,80px)" }}
                    >
                      {d.initials}
                    </div>
                  )}

                  {/* Country flag chip */}
                  <span className="absolute left-4 bottom-4 inline-flex items-center gap-2 rounded-full bg-black/35 px-2.5 py-1 backdrop-blur-sm">
                    <Flag code={d.country} size="sm" />
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-white">
                      {d.country.toUpperCase()}
                    </span>
                  </span>
                </div>

                {/* Card caption */}
                <div className="p-5">
                  <p className="text-base font-semibold leading-tight text-[var(--color-text-primary)]">
                    {d.name}
                  </p>
                  <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                    {d.role}
                  </p>
                  {d.langs ? (
                    <p className="mt-2 text-[11px] uppercase tracking-[0.1em] text-[var(--color-text-muted)]">
                      {d.langs}
                    </p>
                  ) : null}

                  <span
                    className="
                      mt-4 inline-flex items-center gap-1.5
                      text-[var(--color-brand-primary)] text-sm font-semibold
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
