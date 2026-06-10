"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { DoctorCard } from "@/components/cards/DoctorCard";
import { buildBookHref } from "@/lib/routing/book-href";
import type { CountryDoctorCard, CountryServiceCard } from "@/lib/content/get-country-collections";

const LANGUAGE_NAMES: Record<string, string> = {
  en: "English",
  fr: "French",
  pt: "Portuguese",
  es: "Spanish",
  de: "German",
  it: "Italian",
  pl: "Polish",
  ro: "Romanian",
  cs: "Czech",
  nl: "Dutch",
  ar: "Arabic",
  ru: "Russian",
};

function languageLabel(code: string): string {
  return LANGUAGE_NAMES[code.toLowerCase()] ?? code.toUpperCase();
}

export function LanguageFilteredDoctors({
  country,
  lang,
  service,
  doctors,
}: {
  country: string;
  lang: string;
  service: CountryServiceCard;
  doctors: CountryDoctorCard[];
}) {
  const allLanguages = useMemo(() => {
    const set = new Set<string>();
    for (const d of doctors) {
      for (const l of d.languages) set.add(l.toLowerCase());
    }
    return [...set].sort();
  }, [doctors]);

  const [selectedLanguage, setSelectedLanguage] = useState<string>("all");

  const filtered = useMemo(
    () =>
      selectedLanguage === "all"
        ? doctors
        : doctors.filter((d) =>
            d.languages.some((l) => l.toLowerCase() === selectedLanguage),
          ),
    [doctors, selectedLanguage],
  );

  if (doctors.length === 0) {
    return (
      <div className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-white p-6 text-center shadow-[var(--shadow-card)]">
        <p className="font-semibold text-[var(--color-text-primary)]">
          No clinicians are assigned to this service yet.
        </p>
        <p className="mt-2 text-sm text-[var(--color-text-muted)]">
          Browse all doctors or choose another service.
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-3">
          <Link href={`/${country}/${lang}/doctors`} className="gh-btn gh-btn-primary">
            Browse doctors
          </Link>
          <Link
            href={buildBookHref({ country, lang })}
            className="rounded-full border border-[var(--color-border)] px-5 py-3 text-sm font-semibold text-[var(--color-brand-primary)]"
          >
            Change service
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {allLanguages.length > 1 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-[var(--color-text-muted)]">
            Language:
          </span>
          <button
            type="button"
            onClick={() => setSelectedLanguage("all")}
            className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${
              selectedLanguage === "all"
                ? "bg-[var(--color-brand-primary)] text-white"
                : "border border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-[var(--color-background-soft)]"
            }`}
          >
            All
          </button>
          {allLanguages.map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => setSelectedLanguage(l)}
              className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${
                selectedLanguage === l
                  ? "bg-[var(--color-brand-primary)] text-white"
                  : "border border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-[var(--color-background-soft)]"
              }`}
            >
              {languageLabel(l)}
            </button>
          ))}
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-white p-6 text-center shadow-[var(--shadow-card)]">
          <p className="font-semibold text-[var(--color-text-primary)]">
            No doctors are currently available for this service in{" "}
            {languageLabel(selectedLanguage)}.
          </p>
          <p className="mt-2 text-sm text-[var(--color-text-muted)]">
            Please choose another language or check again later.
          </p>
          <button
            type="button"
            onClick={() => setSelectedLanguage("all")}
            className="mt-4 text-sm font-semibold text-[var(--color-brand-primary)] hover:underline"
          >
            Show all languages
          </button>
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-x-8 gap-y-8 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((doctor) => (
            <li key={doctor.id}>
              <DoctorCard
                name={doctor.fullName}
                title={doctor.title}
                imcRegistration={doctor.imcRegistration}
                medicalRegistrationUrl={doctor.medicalRegistrationUrl}
                languages={doctor.languages}
                whatsappNumber={doctor.whatsappNumber}
                bio={doctor.bio ?? ""}
                imageSrc={doctor.imageSrc ?? null}
                href={`/${country}/${lang}/doctors/${doctor.slug}`}
                bookingHref={buildBookHref({
                  country,
                  lang,
                  service: service.slug,
                  doctor: doctor.slug,
                })}
                ctaLabel="View profile"
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
