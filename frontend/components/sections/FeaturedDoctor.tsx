"use client";

/**
 * Featured doctor spotlight — dark luxury version.
 * Forest-night canvas, glass card, lime accent CTAs.
 *
 * Two rendering modes:
 * - default (standalone=true): wraps in its own <section>
 * - asCard (standalone=false): card only, no section wrapper
 */

import Image from "next/image";
import { ArrowRight, Globe, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { toDoctorBioPlainText } from "@/lib/content/doctor-bio-format";

type DoctorSpotlightProps = {
  name: string;
  title: string;
  imcRegistration?: string;
  medicalRegistrationUrl?: string;
  languages?: string[];
  bio: string;
  imageSrc?: string | null;
  href?: string;
};

export function FeaturedDoctor({
  doctor,
  standalone = true,
}: {
  doctor: DoctorSpotlightProps;
  standalone?: boolean;
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

  const firstName = doctor.name
    .replace(/^Dr\.?\s*/i, "")
    .split(" ")[0] ?? doctor.name;

  const card = (
    <>
      <div
        className="gh-featured-card overflow-hidden"
        style={{
          borderRadius: "var(--radius-card)",
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.09)",
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
          {/* Right-edge fade into card body on desktop */}
          <div
            aria-hidden
            className="absolute inset-y-0 right-0 w-16 hidden sm:block"
            style={{
              background:
                "linear-gradient(90deg, transparent 0%, rgba(15,46,37,0.60) 100%)",
            }}
          />
        </div>

        {/* Info column */}
        <div className="flex flex-col justify-between p-7 md:p-10">
          <div>
            {/* Specialty tag */}
            <span
              className="inline-flex items-center rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.1em]"
              style={{
                background: "rgba(176,241,34,0.10)",
                border: "1px solid rgba(176,241,34,0.18)",
                color: "var(--color-brand-accent)",
              }}
            >
              {doctor.title}
            </span>

            {/* Name */}
            <h3
              className="mt-3 font-extrabold tracking-[-0.03em] leading-tight text-[length:var(--text-h2)]"
              style={{ color: "rgba(255,255,255,0.92)" }}
            >
              {doctor.name}
            </h3>

            {/* Meta row */}
            <div className="mt-4 flex flex-wrap gap-4">
              {doctor.imcRegistration && (
                <span className="inline-flex items-center gap-1.5 text-[13px]">
                  <ShieldCheck
                    className="size-4 shrink-0"
                    style={{ color: "var(--color-brand-accent)" }}
                    strokeWidth={1.5}
                    aria-hidden
                  />
                  {doctor.medicalRegistrationUrl ? (
                    <a
                      href={doctor.medicalRegistrationUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-semibold transition-opacity hover:opacity-75 motion-reduce:transition-none"
                      style={{ color: "rgba(255,255,255,0.65)" }}
                    >
                      {doctor.imcRegistration}
                    </a>
                  ) : (
                    <span
                      className="font-semibold"
                      style={{ color: "rgba(255,255,255,0.65)" }}
                    >
                      {doctor.imcRegistration}
                    </span>
                  )}
                </span>
              )}

              <span className="inline-flex items-center gap-1.5 text-[13px]">
                <Globe
                  className="size-4 shrink-0"
                  style={{ color: "var(--color-brand-accent)" }}
                  strokeWidth={1.5}
                  aria-hidden
                />
                <span
                  className="font-semibold"
                  style={{ color: "rgba(255,255,255,0.65)" }}
                >
                  {languageList}
                </span>
              </span>
            </div>

            {/* Bio excerpt */}
            {bioPreview ? (
              <p
                className="mt-5 line-clamp-3 text-[length:var(--text-body)] leading-relaxed"
                style={{ color: "rgba(255,255,255,0.48)", maxWidth: "52ch" }}
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
                className="inline-flex items-center gap-2 rounded-full px-6 py-3 text-[13.5px] font-bold transition-[background-color,transform] duration-200 hover:opacity-90 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-accent)]/40 motion-reduce:transition-none"
                style={{ background: "var(--color-brand-accent)", color: "#0a1f14" }}
              >
                Book with {firstName}
                <ArrowRight className="size-4 shrink-0" strokeWidth={1.8} aria-hidden />
              </Link>
            ) : null}
            {doctor.href ? (
              <Link
                href={doctor.href}
                className="inline-flex items-center gap-1.5 text-[13px] font-semibold transition-opacity hover:opacity-70 motion-reduce:transition-none"
                style={{ color: "rgba(255,255,255,0.48)" }}
              >
                View profile
              </Link>
            ) : null}
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
    </>
  );

  if (standalone) {
    return (
      <section
        style={{
          background: "var(--color-background-dark)",
          borderTop: "1px solid rgba(255,255,255,0.06)",
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
          <p
            className="mb-8 text-[11px] font-bold uppercase tracking-[0.22em]"
            style={{ color: "var(--color-brand-accent)" }}
          >
            Featured clinician
          </p>
          {card}
        </div>
      </section>
    );
  }

  return card;
}
