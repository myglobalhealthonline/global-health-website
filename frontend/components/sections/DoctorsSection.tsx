"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DoctorCard } from "@/components/cards/DoctorCard";

type DoctorItem = {
  name: string;
  title: string;
  imcRegistration?: string;
  medicalRegistrationUrl?: string;
  country?: string;
  languages?: string[];
  whatsappNumber?: string;
  bio: string;
  imageSrc?: string | null;
  href?: string;
  ctaLabel?: string;
};

type DoctorsSectionProps = {
  title?: string;
  intro?: string;
  doctors: DoctorItem[];
};

const PAGE_SIZE = 6;

export function DoctorsSection({ title, intro, doctors }: DoctorsSectionProps) {
  const [page, setPage] = useState(0);

  const totalPages = Math.ceil(doctors.length / PAGE_SIZE);
  const paged = doctors.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const showPager = totalPages > 1;

  return (
    <section
      style={{
        background: "var(--color-background-soft)",
        padding: "clamp(64px,8vw,120px) 0",
      }}
    >
      <div className="mx-auto max-w-[var(--container-width)] px-5 md:px-10">
        {(title || intro) && (
          <div className="flex flex-wrap items-end justify-between gap-4 mb-12 lg:mb-14">
            <div>
              <span
                className="text-[11px] font-bold uppercase tracking-[0.2em]"
                style={{ color: "var(--color-brand-primary)" }}
              >
                Our Team
              </span>
              {title && (
                <h2
                  className="mt-3 font-extrabold tracking-[-0.03em] leading-[1.05]"
                  style={{
                    fontSize: "clamp(1.85rem,3.5vw,3rem)",
                    color: "var(--color-text-primary)",
                  }}
                >
                  {title}
                </h2>
              )}
              {intro ? (
                <p
                  className="mt-3 max-w-2xl text-[length:var(--text-body-lg)] leading-relaxed"
                  style={{ color: "var(--color-text-muted)" }}
                >
                  {intro}
                </p>
              ) : null}
            </div>

            {showPager && (
              <div className="flex items-center gap-3 shrink-0">
                <button
                  onClick={() => setPage((p) => p - 1)}
                  disabled={page === 0}
                  aria-label="Previous page"
                  className="size-10 rounded-full border inline-flex items-center justify-center transition-[background-color,border-color,opacity] duration-200 disabled:opacity-30 disabled:cursor-not-allowed"
                  style={
                    page === 0
                      ? {
                          background: "transparent",
                          borderColor: "var(--color-border)",
                          color: "var(--color-text-muted)",
                        }
                      : {
                          background: "var(--color-brand-primary)",
                          borderColor: "var(--color-brand-primary)",
                          color: "#fff",
                        }
                  }
                >
                  <ChevronLeft size={18} />
                </button>

                <span
                  className="text-[11px] font-bold tabular-nums"
                  style={{ color: "var(--color-text-muted)" }}
                >
                  {page + 1} / {totalPages}
                </span>

                <button
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page === totalPages - 1}
                  aria-label="Next page"
                  className="size-10 rounded-full border inline-flex items-center justify-center transition-[background-color,border-color,opacity] duration-200 disabled:opacity-30 disabled:cursor-not-allowed"
                  style={
                    page === totalPages - 1
                      ? {
                          background: "transparent",
                          borderColor: "var(--color-border)",
                          color: "var(--color-text-muted)",
                        }
                      : {
                          background: "var(--color-brand-primary)",
                          borderColor: "var(--color-brand-primary)",
                          color: "#fff",
                        }
                  }
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
          {paged.map((doctor) => (
            <DoctorCard key={doctor.href ?? `${doctor.name}-${doctor.title}`} {...doctor} />
          ))}
        </div>
      </div>
    </section>
  );
}
