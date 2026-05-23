"use client";

import Image from "next/image";
import { ArrowRight, Globe, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { toDoctorBioPlainText } from "@/lib/content/doctor-bio-format";

/**
 * Featured doctor spotlight — mint-panel surface, full-bleed portrait left,
 * editorial info right. Breaks DoctorWall grid monotony with a promoted
 * single doctor that has enough content (bio + image) to fill the layout.
 */
export function FeaturedDoctor({
  doctor,
}: {
  doctor: {
    name: string;
    title: string;
    imcRegistration?: string;
    medicalRegistrationUrl?: string;
    languages?: string[];
    bio: string;
    imageSrc?: string | null;
    href?: string;
  };
}) {
  const src = doctor.imageSrc?.trim()
    ? doctor.imageSrc.trim()
    : "/images/ireland/doctor-spotlight-ai.svg";
  const unoptimized =
    /^https?:\/\//i.test(src) || src.startsWith("/api/media/");
  const languageList =
    doctor.languages && doctor.languages.length > 0
      ? doctor.languages.join(", ")
      : "English";
  const bioPreview = toDoctorBioPlainText(doctor.bio);

  // First name only for the CTA ("Book with Gráinne" not full name)
  const firstName = doctor.name
    .replace(/^Dr\.?\s*/i, "")
    .split(" ")[0] ?? doctor.name;

  return (
    <section
      style={{
        background: "var(--color-background-panel)",
        borderTop: "1px solid var(--color-border)",
        padding: "clamp(48px,7vw,96px) 0",
      }}
    >
      <div
        className="mx-auto"
        style={{
          maxWidth: "var(--container-width)",
          padding: "0 clamp(20px,4vw,40px)",
        }}
      >
        {/* Eyebrow */}
        <p
          className="mb-8 text-[11px] font-bold uppercase tracking-[0.2em]"
          style={{ color: "var(--color-brand-primary)" }}
        >
          Featured clinician
        </p>

        {/* Card — responsive two-column grid */}
        <div
          className="gh-featured-card overflow-hidden"
          style={{
            borderRadius: "var(--radius-card)",
            background: "#FFFFFF",
            border: "1px solid var(--color-border)",
            boxShadow: "var(--shadow-elevated)",
          }}
        >
          {/* Portrait */}
          <div
            className="relative overflow-hidden gh-featured-photo"
            style={{ minHeight: 240 }}
          >
            <Image
              src={src}
              alt={doctor.name}
              fill
              unoptimized={unoptimized}
              className="object-cover object-top"
              sizes="(min-width:640px) 340px, 100vw"
            />
          </div>

          {/* Info column */}
          <div className="flex flex-col justify-between p-7 md:p-10">
            <div>
              {/* Specialty tag */}
              <span
                className="inline-flex items-center rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.1em]"
                style={{
                  background: "var(--color-background-panel)",
                  color: "var(--color-brand-primary)",
                  border: "1px solid var(--color-border)",
                }}
              >
                {doctor.title}
              </span>

              {/* Name */}
              <h2
                className="mt-3 font-extrabold tracking-[-0.03em] leading-tight text-[length:var(--text-h2)]"
                style={{ color: "var(--color-text-primary)" }}
              >
                {doctor.name}
              </h2>

              {/* Meta row */}
              <div className="mt-4 flex flex-wrap gap-4">
                {doctor.imcRegistration && (
                  <span className="inline-flex items-center gap-1.5 text-[13px]">
                    <ShieldCheck
                      className="size-4 shrink-0"
                      style={{ color: "var(--color-brand-primary)" }}
                      strokeWidth={1.5}
                      aria-hidden
                    />
                    {doctor.medicalRegistrationUrl ? (
                      <a
                        href={doctor.medicalRegistrationUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-semibold transition-opacity hover:opacity-75"
                        style={{ color: "var(--color-text-body)" }}
                      >
                        {doctor.imcRegistration}
                      </a>
                    ) : (
                      <span
                        className="font-semibold"
                        style={{ color: "var(--color-text-body)" }}
                      >
                        {doctor.imcRegistration}
                      </span>
                    )}
                  </span>
                )}

                <span className="inline-flex items-center gap-1.5 text-[13px]">
                  <Globe
                    className="size-4 shrink-0"
                    style={{ color: "var(--color-brand-primary)" }}
                    strokeWidth={1.5}
                    aria-hidden
                  />
                  <span
                    className="font-semibold"
                    style={{ color: "var(--color-text-body)" }}
                  >
                    {languageList}
                  </span>
                </span>
              </div>

              {/* Bio excerpt */}
              {bioPreview ? (
                <p
                  className="mt-5 line-clamp-3 text-[length:var(--text-body)] leading-relaxed"
                  style={{ color: "var(--color-text-muted)", maxWidth: "52ch" }}
                >
                  {bioPreview}
                </p>
              ) : null}
            </div>

            {/* CTAs */}
            <div className="mt-7 flex flex-wrap items-center gap-3">
              {doctor.href ? (
                <Link
                  href={doctor.href}
                  className="inline-flex items-center gap-2 rounded-full px-6 py-3 text-[13.5px] font-bold text-white transition-[background-color,transform] duration-200 hover:opacity-90 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-primary)]/40"
                  style={{ background: "var(--color-brand-primary)" }}
                >
                  Book with {firstName}
                  <ArrowRight className="size-4 shrink-0" strokeWidth={1.8} aria-hidden />
                </Link>
              ) : null}
              {doctor.href ? (
                <Link
                  href={doctor.href}
                  className="inline-flex items-center gap-1.5 text-[13px] font-semibold transition-opacity hover:opacity-70"
                  style={{ color: "var(--color-text-muted)" }}
                >
                  View profile
                </Link>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .gh-featured-card {
          display: grid;
          grid-template-columns: 1fr;
        }
        @media (min-width: 640px) {
          .gh-featured-card {
            grid-template-columns: 320px 1fr;
          }
          .gh-featured-photo {
            min-height: 360px;
          }
        }
      `}</style>
    </section>
  );
}
