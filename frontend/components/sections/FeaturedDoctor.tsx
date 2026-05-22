"use client";

import Image from "next/image";
import { ArrowRight, Globe, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { Container } from "@/components/layout/Container";
import { toDoctorBioPlainText } from "@/lib/content/doctor-bio-format";

/**
 * Featured doctor spotlight — light luxury version.
 * White card on soft background, forest primary accents, elevated shadow.
 */
export function FeaturedDoctor({ doctor }: {
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
  const src = doctor.imageSrc?.trim() ? doctor.imageSrc.trim() : "/images/ireland/doctor-spotlight-ai.svg";
  const unoptimized = /^https?:\/\//i.test(src) || src.startsWith("/api/media/");
  const languageList = doctor.languages && doctor.languages.length > 0
    ? doctor.languages.join(", ")
    : "English";
  const bioPreview = toDoctorBioPlainText(doctor.bio);

  return (
    <section
      className="bg-[var(--color-background-soft)]"
      style={{ paddingTop: 8, paddingBottom: 32 }}
    >
      <Container>
        <div className="mx-auto max-w-4xl">
          <div
            className="overflow-hidden rounded-[var(--radius-card)] bg-white"
            style={{
              border: "1px solid var(--color-border)",
              boxShadow: "var(--shadow-elevated)",
            }}
          >
            <div className="flex flex-col sm:flex-row">
              {/* Photo */}
              <div className="relative w-full sm:w-60 shrink-0 overflow-hidden">
                <Image
                  src={src}
                  alt={doctor.name}
                  width={240}
                  height={300}
                  unoptimized={unoptimized}
                  className="h-64 sm:h-full w-full object-cover object-top"
                />
              </div>

              {/* Info */}
              <div className="flex flex-1 flex-col p-6 sm:p-8">
                <div>
                  <p
                    className="text-[10px] font-bold uppercase tracking-[0.18em]"
                    style={{ color: "var(--color-brand-primary)" }}
                  >
                    {doctor.title}
                  </p>
                  <h2
                    className="mt-2 text-2xl font-extrabold tracking-[-0.025em]"
                    style={{ color: "var(--color-text-primary)" }}
                  >
                    {doctor.name}
                  </h2>
                </div>

                <div className="mt-4 flex flex-wrap gap-4 text-sm">
                  {doctor.imcRegistration && (
                    <div className="flex items-center gap-2">
                      <ShieldCheck
                        className="size-4 text-[var(--color-brand-primary)]"
                        strokeWidth={1.5}
                      />
                      {doctor.medicalRegistrationUrl ? (
                        <a
                          href={doctor.medicalRegistrationUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[var(--color-text-muted)] hover:text-[var(--color-brand-primary)] transition-colors"
                        >
                          IMC{" "}
                          <span className="mx-1 text-[var(--color-border-strong)]">|</span>{" "}
                          <span className="font-semibold text-[var(--color-text-primary)]">
                            {doctor.imcRegistration}
                          </span>
                        </a>
                      ) : (
                        <span className="text-[var(--color-text-muted)]">
                          IMC{" "}
                          <span className="mx-1 text-[var(--color-border-strong)]">|</span>{" "}
                          <span className="font-semibold text-[var(--color-text-primary)]">
                            {doctor.imcRegistration}
                          </span>
                        </span>
                      )}
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Globe
                      className="size-4 text-[var(--color-brand-primary)]"
                      strokeWidth={1.5}
                    />
                    <span className="text-[var(--color-text-muted)]">
                      <span className="font-semibold text-[var(--color-text-primary)]">
                        {languageList}
                      </span>
                    </span>
                  </div>
                </div>

                <p
                  className="mt-4 text-sm leading-relaxed line-clamp-2"
                  style={{ color: "var(--color-text-muted)" }}
                >
                  {bioPreview}
                </p>

                {doctor.href && (
                  <Link
                    href={doctor.href}
                    className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-[var(--color-brand-primary)] hover:underline"
                  >
                    Learn more
                    <ArrowRight className="size-4" strokeWidth={1.5} />
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
