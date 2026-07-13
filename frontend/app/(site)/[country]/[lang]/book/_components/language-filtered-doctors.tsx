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
  slotByDoctorId,
  at,
  bp,
  insurance,
}: {
  country: string;
  lang: string;
  service: CountryServiceCard;
  doctors: CountryDoctorCard[];
  /** Chosen insurer (id or "none") carried across the doctor-card links. */
  insurance?: string | null;
  /** Service-first time→doctor step: the doctor's concrete slot at the chosen
   *  time, keyed by doctor id. When set, each card books that exact slot so the
   *  patient lands straight on the details step. */
  slotByDoctorId?: Record<string, string>;
  /** Chosen time (ISO) retained on the card href so the details step keeps the
   *  service-first ordering. */
  at?: string;
  bp: import("@/lib/i18n/types").CommonLocale["bookPage"];
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
          {bp.noCliniciansAssigned}
        </p>
        <p className="mt-2 text-sm text-[var(--color-text-muted)]">
          {bp.browseAllOrChoose}
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-3">
          <Link href={`/${country}/${lang}/doctors`} className="gh2-btn-lime">
            {bp.browseDoctors}
          </Link>
          <Link
            href={buildBookHref({ country, lang })}
            className="rounded-full border border-[var(--color-border)] px-5 py-3 text-sm font-semibold text-[var(--color-brand-primary)]"
          >
            {bp.changeService}
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
            {bp.languageLabel}
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
            {bp.languageAll}
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
            {bp.noForLanguage.replace("{language}", languageLabel(selectedLanguage))}
          </p>
          <p className="mt-2 text-sm text-[var(--color-text-muted)]">
            {bp.chooseAnotherLanguage}
          </p>
          <button
            type="button"
            onClick={() => setSelectedLanguage("all")}
            className="mt-4 text-sm font-semibold text-[var(--color-brand-primary)] hover:underline"
          >
            {bp.showAllLanguages}
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
                imageAltText={doctor.imageAltText}
                imageTitle={doctor.imageTitle}
                imageCaption={doctor.imageCaption}
                imageDescription={doctor.imageDescription}
                href={`/${country}/${lang}/doctors/${doctor.slug}`}
                bookingHref={buildBookHref({
                  country,
                  lang,
                  service: service.slug,
                  insurance,
                  doctor: doctor.slug,
                  slot: slotByDoctorId?.[doctor.id] ?? null,
                  at: at ?? null,
                })}
                primaryLabel={bp.continue}
                ctaLabel="View"
                dark
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
