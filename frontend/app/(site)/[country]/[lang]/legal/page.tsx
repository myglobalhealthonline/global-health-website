import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCountryByCode } from "@/data/countries";
import { countryCodeFromSlug } from "@/lib/routing/country-slug";
import { isSupportedLocale } from "@/lib/content/get-public-page";
import {
  getCountryLegal,
  LEGAL_TYPE_SLUGS,
  type LegalDocumentType,
  type PublicLegalProfile,
} from "@/lib/content/get-country-legal";
import { SITE_NAME } from "@/lib/constants";
import { GH2CompactHero } from "@/components/sections/GH2PagePrimitives";
import type { CommonLocale, LocaleCode } from "@/lib/i18n/types";
import { loadLocaleBundle } from "@/lib/i18n/load-locale";

export const revalidate = 300;

type Params = { country: string; lang: string };
type LegalT = CommonLocale["legalPage"];

function legalTypeLabels(t: LegalT): Record<LegalDocumentType, string> {
  return {
    TERMS_OF_SERVICE: t.typeTermsOfService,
    PRIVACY_POLICY: t.typePrivacyPolicy,
    COOKIE_POLICY: t.typeCookiePolicy,
    GDPR_NOTICE: t.typeGdprNotice,
    DATA_PROCESSING_AGREEMENT: t.typeDataProcessingAgreement,
    REFUND_POLICY: t.typeRefundPolicy,
    MEDICAL_DISCLAIMER: t.typeMedicalDisclaimer,
    ACCESSIBILITY_STATEMENT: t.typeAccessibilityStatement,
  };
}

const DATE_FMT = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { country } = await params;
  const code = countryCodeFromSlug(country);
  const config = code ? getCountryByCode(code) : null;
  if (!config) return { title: SITE_NAME };
  return {
    title: `Legal information — ${config.name}`,
    description: `Legal documents, company registration and regulatory information for ${SITE_NAME} in ${config.name}.`,
  };
}

function InfoRow({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-4">
      <dt className="shrink-0 text-[13px] font-bold uppercase tracking-[0.08em] text-[var(--color-text-muted)] sm:w-56">
        {label}
      </dt>
      <dd className="m-0 text-[15px] text-[var(--color-text-body)]">{value}</dd>
    </div>
  );
}

function LinkRow({ label, href }: { label: string; href: string | null }) {
  if (!href) return null;
  return (
    <li>
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="font-medium text-[var(--color-brand-primary)] underline underline-offset-2"
      >
        {label}
      </a>
    </li>
  );
}

function CompanySection({ profile, countryName, t }: { profile: PublicLegalProfile; countryName: string; t: LegalT }) {
  const hasCompanyFacts =
    profile.legalCompanyName ||
    profile.legalAddress ||
    profile.companyRegistrationNumber ||
    profile.taxVatNumber ||
    profile.medicalRegistrationNumber ||
    profile.healthcareLicenseDetails ||
    profile.regulatorName;

  const oversightLinks = [
    { label: t.linkCompanyRegistry, href: profile.companyRegistryUrl },
    { label: t.linkMedicalRegulator, href: profile.medicalRegulatorUrl },
    { label: t.linkHealthcareAuthority, href: profile.healthcareAuthorityUrl },
    { label: t.linkDataProtectionAuthority, href: profile.dataProtectionAuthorityUrl },
    { label: t.linkDisputeResolution, href: profile.disputeResolutionUrl },
    { label: t.linkConsumerProtection, href: profile.consumerProtectionUrl },
    { label: profile.regulatorName ?? t.regulatorFallback, href: profile.regulatorWebsite },
  ].filter((l) => l.href);

  const hasDispute =
    profile.disputeBodyName ||
    profile.disputeEmail ||
    profile.disputePhone ||
    profile.disputeProcessText;

  return (
    <>
      {hasCompanyFacts ? (
        <section>
          <h2 className="text-xl font-extrabold tracking-[-0.01em] text-[var(--color-text-primary)]">
            {t.companyInformation}
          </h2>
          <dl className="mt-4 space-y-3">
            <InfoRow label={t.legalName} value={profile.legalCompanyName} />
            <InfoRow label={t.registeredAddress} value={profile.legalAddress} />
            <InfoRow label={t.registrationNumber} value={profile.companyRegistrationNumber} />
            <InfoRow label={t.taxVatNumber} value={profile.taxVatNumber} />
            <InfoRow label={t.medicalRegistration} value={profile.medicalRegistrationNumber} />
            <InfoRow label={t.healthcareLicence} value={profile.healthcareLicenseDetails} />
            <InfoRow label={t.regulator} value={profile.regulatorName} />
            <InfoRow label={t.supportEmail} value={profile.supportEmail} />
            <InfoRow
              label={t.phone}
              value={profile.publicPhones.length > 0 ? profile.publicPhones.join(" · ") : null}
            />
            <InfoRow
              label={t.email}
              value={profile.publicEmails.length > 0 ? profile.publicEmails.join(" · ") : null}
            />
          </dl>
        </section>
      ) : null}

      {profile.dataProtectionLawName || profile.dpoName || profile.dpoEmail ? (
        <section>
          <h2 className="text-xl font-extrabold tracking-[-0.01em] text-[var(--color-text-primary)]">
            {t.dataProtection}
          </h2>
          <dl className="mt-4 space-y-3">
            <InfoRow label={t.applicableLaw} value={profile.dataProtectionLawName} />
            <InfoRow label={t.dataProtectionOfficer} value={profile.dpoName} />
            <InfoRow label={t.dpoContact} value={profile.dpoEmail} />
          </dl>
        </section>
      ) : null}

      {oversightLinks.length > 0 ? (
        <section>
          <h2 className="text-xl font-extrabold tracking-[-0.01em] text-[var(--color-text-primary)]">
            {t.regulatorsOversight}
          </h2>
          <ul className="mt-4 list-inside list-disc space-y-2">
            {oversightLinks.map((l) => (
              <LinkRow key={l.label} label={l.label} href={l.href ?? null} />
            ))}
          </ul>
        </section>
      ) : null}

      {hasDispute ? (
        <section>
          <h2 className="text-xl font-extrabold tracking-[-0.01em] text-[var(--color-text-primary)]">
            {t.disputesComplaints}
          </h2>
          <dl className="mt-4 space-y-3">
            <InfoRow label={t.disputeBody} value={profile.disputeBodyName} />
            <InfoRow label={t.email} value={profile.disputeEmail} />
            <InfoRow label={t.phone} value={profile.disputePhone} />
          </dl>
          {profile.disputeProcessText ? (
            <p className="mt-3 text-[15px] leading-relaxed text-[var(--color-text-body)]">
              {profile.disputeProcessText}
            </p>
          ) : null}
          {profile.consumerRightsText ? (
            <p className="mt-3 text-[15px] leading-relaxed text-[var(--color-text-body)]">
              {profile.consumerRightsText}
            </p>
          ) : null}
          {profile.legalJurisdictionText ? (
            <p className="mt-3 text-[15px] leading-relaxed text-[var(--color-text-body)]">
              {profile.legalJurisdictionText}
            </p>
          ) : null}
        </section>
      ) : null}
      <span className="sr-only">{countryName}</span>
    </>
  );
}

export default async function CountryLegalIndexPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { country: slug, lang } = await params;
  const code = countryCodeFromSlug(slug);
  if (!code) notFound();
  const config = getCountryByCode(code);
  if (!config) notFound();
  if (!isSupportedLocale(lang)) notFound();

  const { common: c } = loadLocaleBundle(lang as LocaleCode);
  const t = c.legalPage;
  const typeLabels = legalTypeLabels(t);

  const legal = await getCountryLegal(code);

  // Deduplicate per type (a document may exist in several locales) — prefer
  // the active page language, then English, then whatever is published.
  const localeScore = (l: string) =>
    l.toLowerCase() === lang.toLowerCase() ? 2 : l.toLowerCase() === "en" ? 1 : 0;
  const byType = new Map<
    LegalDocumentType,
    { title: string; updatedAt: string; hasPdf: boolean; score: number }
  >();
  for (const doc of legal?.documents ?? []) {
    const existing = byType.get(doc.type);
    const score = localeScore(doc.locale);
    if (!existing || score > existing.score) {
      byType.set(doc.type, { title: doc.title, updatedAt: doc.updatedAt, hasPdf: doc.hasPdf, score });
    }
  }
  const documents = [...byType.entries()];

  return (
    <>
      <GH2CompactHero
        eyebrow={t.heroEyebrow.replace("{country}", config.name)}
        title={t.heroTitle}
        accent={t.heroAccent}
        watermark={t.heroWatermark}
        body={t.heroBody.replace("{site}", SITE_NAME).replace("{country}", config.name)}
      />

      <section className="relative overflow-hidden gh2-section-ivory gh-medical-pattern gh-medical-pattern-panel">
        <div
          className="mx-auto max-w-3xl px-5 md:px-10"
          style={{ padding: "clamp(48px,6vw,80px) 20px" }}
        >
        <div className="space-y-10">
          {documents.length > 0 ? (
            <section>
              <h2 className="text-xl font-extrabold tracking-[-0.01em] text-[var(--color-text-primary)]">
                {t.legalDocuments}
              </h2>
              <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                {documents.map(([type, doc]) => (
                  <li key={type}>
                    <Link
                      href={`/${slug}/${lang}/legal/${LEGAL_TYPE_SLUGS[type]}`}
                      className="group flex h-full flex-col rounded-[20px] border border-[var(--color-border,rgba(15,46,37,0.10))] bg-white p-5 transition-shadow hover:shadow-[0_4px_12px_rgba(15,46,37,0.12),0_8px_24px_rgba(15,46,37,0.08)]"
                      style={{ boxShadow: "0 1px 3px rgba(15,46,37,0.08), 0 4px 12px rgba(15,46,37,0.04)" }}
                    >
                      <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
                        {typeLabels[type]}
                      </span>
                      <span className="mt-1 text-[16px] font-bold text-[var(--color-text-primary)] group-hover:underline group-hover:underline-offset-2">
                        {doc.title}
                      </span>
                      <span className="mt-2 text-[12px] text-[var(--color-text-muted)]">
                        {t.updated.replace("{date}", DATE_FMT.format(new Date(doc.updatedAt)))}
                        {doc.hasPdf ? t.pdfAvailable : ""}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : (
            <section>
              <h2 className="text-xl font-extrabold tracking-[-0.01em] text-[var(--color-text-primary)]">
                {t.legalDocuments}
              </h2>
              <p className="mt-3 text-[15px] leading-relaxed text-[var(--color-text-body)]">
                {t.docsEmptyLead}{" "}
                <Link
                  href="/privacy"
                  className="font-medium text-[var(--color-brand-primary)] underline underline-offset-2"
                >
                  {t.privacyNoticeLink}
                </Link>{" "}
                {t.andWord}{" "}
                <Link
                  href="/terms"
                  className="font-medium text-[var(--color-brand-primary)] underline underline-offset-2"
                >
                  {t.termsLink}
                </Link>{" "}
                {t.applyWord}
              </p>
            </section>
          )}

          {legal?.profile ? (
            <CompanySection profile={legal.profile} countryName={config.name} t={t} />
          ) : null}

          {legal?.authorityLinks && legal.authorityLinks.length > 0 ? (
            <section>
              <h2 className="text-xl font-extrabold tracking-[-0.01em] text-[var(--color-text-primary)]">
                Regulatory &amp; professional authorities
              </h2>
              <p className="mt-2 text-[15px] text-[var(--color-text-muted)]">
                Official bodies governing {config.name} medical practice, data protection and
                consumer rights. You can verify our registrations directly with each authority.
              </p>
              <ul className="mt-4 grid gap-2 sm:grid-cols-2">
                {legal.authorityLinks.map((a) => (
                  <li key={a.url}>
                    <a
                      href={a.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-[var(--color-brand-primary)] underline underline-offset-2"
                    >
                      {a.abbreviation ? `${a.name} (${a.abbreviation})` : a.name}
                    </a>
                    {a.description ? (
                      <span className="block text-[13px] text-[var(--color-text-muted)]">{a.description}</span>
                    ) : null}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {legal?.profile?.emergencyNotice || legal?.profile?.nonEmergencyHealthLine ? (
            <section
              className="rounded-2xl p-5"
              style={{ background: "var(--color-background-soft)", border: "1px solid rgba(29,75,54,0.12)" }}
            >
              <h2 className="text-[15px] font-extrabold uppercase tracking-[0.08em] text-[var(--color-brand-primary)]">
                Emergencies
              </h2>
              <p className="mt-2 text-[15px] text-[var(--color-text-body)]">
                {legal.profile.emergencyNotice ??
                  `In a medical emergency call ${legal.profile.emergencyNumber ?? "112"} immediately. Online consultations are not suitable for emergencies.`}
                {legal.profile.nonEmergencyHealthLine ? ` · ${legal.profile.nonEmergencyHealthLine}` : ""}
              </p>
            </section>
          ) : null}
        </div>
        </div>
      </section>
    </>
  );
}
