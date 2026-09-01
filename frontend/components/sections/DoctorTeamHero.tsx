import { DoctorsHero } from "@/components/sections/DoctorsHero";
import type { DoctorTeamI18n } from "@/components/templates/DoctorTeamTemplate";
import type { BookabilityActionProps } from "@/components/booking/BookNowButton";

const APPROVED_CZECH_DOCTORS_HERO = {
  title: "Online lékaři v Česku",
  lede:
    "Vyberte si z ověřených profilů lékařů registrovaných v Česku. U každého najdete jazyky, registrační údaje a aktuální možnost rezervace.",
} as const;

export type ApprovedDoctorHeroCopy = Readonly<{
  titleLead: string;
  titleAccent: string;
  lede: string;
}>;

export function approvedCzechDoctorHeroCopy(
  countryCode: string,
  locale: string,
  heroTitle: string | null | undefined,
  heroSubtitle: string | null | undefined,
): ApprovedDoctorHeroCopy | null {
  if (
    countryCode.toLowerCase() !== "cz" ||
    locale.toLowerCase() !== "cs" ||
    heroTitle !== APPROVED_CZECH_DOCTORS_HERO.title ||
    heroSubtitle !== APPROVED_CZECH_DOCTORS_HERO.lede
  ) {
    return null;
  }
  return {
    titleLead: "Online lékaři",
    titleAccent: "v Česku",
    lede: APPROVED_CZECH_DOCTORS_HERO.lede,
  };
}

/**
 * The /doctors directory hero, lifted out of `DoctorTeamTemplate` so it
 * renders exactly ONCE per page.
 *
 * The template lives inside a Suspense boundary (the client filter layer
 * needs `useSearchParams`), and a dynamically rendered page streams BOTH the
 * fallback and the resolved child into the HTML — which shipped two identical
 * <h1>s on all 33 country/locale directory pages. The fallback still has to
 * carry the real directory for the statically prerendered case, so the fix is
 * to keep the heading outside the boundary rather than to empty the fallback.
 *
 * Server component by design: it must render in the page body, above the
 * boundary, and it keeps the hero out of the client bundle.
 */
export function DoctorTeamHero({
  countryName,
  bookingHref,
  bookingLabel,
  availableCount,
  i18n,
  bookability,
  unavailableLabel,
  returningLabel,
  nextAvailableLabel,
  heroCopy,
}: {
  countryName: string;
  bookingHref: string;
  bookingLabel: string;
  /** Full roster size — the hero sits above the filters, so it is never scoped
   *  to the active ?lang/?type selection. */
  availableCount: number;
  i18n?: DoctorTeamI18n;
  heroCopy?: ApprovedDoctorHeroCopy | null;
} & BookabilityActionProps) {
  return (
    // `.gh-medical-pattern { overflow: clip }` on the section this hero used to
    // sit inside is what kept its own `right-[-6%]` pattern layer from widening
    // the page. The hero itself is deliberately `!overflow-visible`, so hoisting
    // it out needs that clip back — `clip`, not `hidden`, so no scroll container
    // is created and `position: sticky` descendants keep working.
    <div className="overflow-x-clip">
        <DoctorsHero
        countryName={countryName}
        eyebrow={`${countryName} · ${i18n?.theTeamBadge ?? "The team"}`}
        titleLead={heroCopy?.titleLead ?? i18n?.heroTitleLead ?? "Doctors who"}
        titleAccent={heroCopy?.titleAccent ?? i18n?.heroTitleAccent ?? "actually"}
        titleTrail={heroCopy ? undefined : (i18n?.heroTitleTrail ?? "pick up.")}
        lede={heroCopy?.lede ?? (i18n?.heroLedeTemplate ?? "Every clinician below is licensed in {country}, vetted for online care, and reviewed by patients after each consultation.").replace("{country}", countryName)}
        availableCount={availableCount}
        availableLabel={
          availableCount === 1
            ? (i18n?.heroAvailableSingular ?? "licensed clinician available")
            : (i18n?.heroAvailablePlural ?? "licensed clinicians available")
        }
        primaryCta={{
          label: bookingLabel,
          href: bookingHref,
          bookability,
          unavailableLabel,
          returningLabel,
          nextAvailableLabel,
        }}
        secondaryCta={{ label: i18n?.viewDoctors ?? "View Doctors", href: "#doctor-grid" }}
        trustCard1Title={i18n?.trustCard1Title}
        trustCard1Subtitle={i18n?.trustCard1Subtitle}
        trustCard2Title={i18n?.trustCard2Title}
        trustCard2Subtitle={i18n?.trustCard2Subtitle}
        trustCard3Title={i18n?.trustCard3Title}
        trustCard3Subtitle={i18n?.trustCard3Subtitle}
        floatCard1Title={i18n?.floatCard1Title}
        floatCard1Subtitle={i18n?.floatCard1Subtitle}
        floatCard2Title={i18n?.floatCard2Title}
        floatCard2Subtitle={i18n?.floatCard2Subtitle}
        floatCard3Title={i18n?.floatCard3Title}
        floatCard3Subtitle={i18n?.floatCard3Subtitle}
        heroImage={{
          src: "/images/stock/doctors.jpg",
          alt: `Doctors available for online consultations in ${countryName}`,
          priority: true,
        }}
      />
    </div>
  );
}
