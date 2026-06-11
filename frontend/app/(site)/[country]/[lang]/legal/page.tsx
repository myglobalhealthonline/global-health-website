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

export const revalidate = 300;

type Params = { country: string; lang: string };

const TYPE_LABELS: Record<LegalDocumentType, string> = {
  TERMS_OF_SERVICE: "Terms of Service",
  PRIVACY_POLICY: "Privacy Policy",
  COOKIE_POLICY: "Cookie Policy",
  GDPR_NOTICE: "Data Protection Notice",
  DATA_PROCESSING_AGREEMENT: "Data Processing Agreement",
  REFUND_POLICY: "Refund Policy",
  MEDICAL_DISCLAIMER: "Medical Disclaimer",
  ACCESSIBILITY_STATEMENT: "Accessibility Statement",
};

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

function CompanySection({ profile, countryName }: { profile: PublicLegalProfile; countryName: string }) {
  const hasCompanyFacts =
    profile.legalCompanyName ||
    profile.legalAddress ||
    profile.companyRegistrationNumber ||
    profile.taxVatNumber ||
    profile.medicalRegistrationNumber ||
    profile.healthcareLicenseDetails ||
    profile.regulatorName;

  const oversightLinks = [
    { label: "Company registry", href: profile.companyRegistryUrl },
    { label: "Medical regulator", href: profile.medicalRegulatorUrl },
    { label: "Healthcare authority", href: profile.healthcareAuthorityUrl },
    { label: "Data protection authority", href: profile.dataProtectionAuthorityUrl },
    { label: "Dispute resolution platform", href: profile.disputeResolutionUrl },
    { label: "Consumer protection", href: profile.consumerProtectionUrl },
    { label: profile.regulatorName ?? "Regulator", href: profile.regulatorWebsite },
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
            Company information
          </h2>
          <dl className="mt-4 space-y-3">
            <InfoRow label="Legal name" value={profile.legalCompanyName} />
            <InfoRow label="Registered address" value={profile.legalAddress} />
            <InfoRow label="Registration number" value={profile.companyRegistrationNumber} />
            <InfoRow label="Tax / VAT number" value={profile.taxVatNumber} />
            <InfoRow label="Medical registration" value={profile.medicalRegistrationNumber} />
            <InfoRow label="Healthcare licence" value={profile.healthcareLicenseDetails} />
            <InfoRow label="Regulator" value={profile.regulatorName} />
            <InfoRow label="Support email" value={profile.supportEmail} />
            <InfoRow
              label="Phone"
              value={profile.publicPhones.length > 0 ? profile.publicPhones.join(" · ") : null}
            />
            <InfoRow
              label="Email"
              value={profile.publicEmails.length > 0 ? profile.publicEmails.join(" · ") : null}
            />
          </dl>
        </section>
      ) : null}

      {profile.dataProtectionLawName || profile.dpoName || profile.dpoEmail ? (
        <section>
          <h2 className="text-xl font-extrabold tracking-[-0.01em] text-[var(--color-text-primary)]">
            Data protection
          </h2>
          <dl className="mt-4 space-y-3">
            <InfoRow label="Applicable law" value={profile.dataProtectionLawName} />
            <InfoRow label="Data protection officer" value={profile.dpoName} />
            <InfoRow label="DPO contact" value={profile.dpoEmail} />
          </dl>
        </section>
      ) : null}

      {oversightLinks.length > 0 ? (
        <section>
          <h2 className="text-xl font-extrabold tracking-[-0.01em] text-[var(--color-text-primary)]">
            Regulators and oversight
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
            Disputes and complaints
          </h2>
          <dl className="mt-4 space-y-3">
            <InfoRow label="Dispute body" value={profile.disputeBodyName} />
            <InfoRow label="Email" value={profile.disputeEmail} />
            <InfoRow label="Phone" value={profile.disputePhone} />
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
        eyebrow={`${config.name} · Legal`}
        title="Legal"
        accent="information."
        watermark="Legal"
        body={`Legal documents, company registration and regulatory details for ${SITE_NAME} in ${config.name}.`}
      />

      <section
        className="mx-auto max-w-3xl px-5 md:px-10"
        style={{ padding: "clamp(48px,6vw,80px) 20px" }}
      >
        <div className="space-y-10">
          {documents.length > 0 ? (
            <section>
              <h2 className="text-xl font-extrabold tracking-[-0.01em] text-[var(--color-text-primary)]">
                Legal documents
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
                        {TYPE_LABELS[type]}
                      </span>
                      <span className="mt-1 text-[16px] font-bold text-[var(--color-text-primary)] group-hover:underline group-hover:underline-offset-2">
                        {doc.title}
                      </span>
                      <span className="mt-2 text-[12px] text-[var(--color-text-muted)]">
                        Updated {DATE_FMT.format(new Date(doc.updatedAt))}
                        {doc.hasPdf ? " · PDF available" : ""}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : (
            <section>
              <h2 className="text-xl font-extrabold tracking-[-0.01em] text-[var(--color-text-primary)]">
                Legal documents
              </h2>
              <p className="mt-3 text-[15px] leading-relaxed text-[var(--color-text-body)]">
                Country-specific legal documents are being prepared. In the meantime, our{" "}
                <Link
                  href="/privacy"
                  className="font-medium text-[var(--color-brand-primary)] underline underline-offset-2"
                >
                  privacy notice
                </Link>{" "}
                and{" "}
                <Link
                  href="/terms"
                  className="font-medium text-[var(--color-brand-primary)] underline underline-offset-2"
                >
                  terms of service
                </Link>{" "}
                apply.
              </p>
            </section>
          )}

          {legal?.profile ? (
            <CompanySection profile={legal.profile} countryName={config.name} />
          ) : null}
        </div>
      </section>
    </>
  );
}
