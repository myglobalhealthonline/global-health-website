import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { redirect } from "next/navigation";
import { revalidatePath, revalidateTag } from "next/cache";
import { countryLegalCacheTag } from "@/lib/content/get-country-legal";
import { requireAdminAction } from "@/lib/admin/require-admin-action";
import { PhoneField } from "@/components/forms/phone-field";
import {
  fetchAdminCountryById,
  fetchAdminCountryLegalProfile,
  fetchAdminAuthorityLinks,
  putAdminCountryLegalProfile,
} from "@/lib/admin/admin-api";
import { resolveCountryLocaleTabs } from "@/lib/admin/service-form-parse";
import { AdminCard, Btn, PageHeader } from "../../../_components/atoms";
import { FlagBadge } from "../../../_components/flag-badge";
import { AuthorityLinksManager } from "./_authority-links-manager";
import { DisclaimerTranslationTabs } from "./_disclaimer-translation-tabs";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ success?: string; error?: string }>;
};

export default async function CountryLegalProfilePage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const sp = searchParams ? await searchParams : {};

  const [countryRes, profileRes, authorityRes] = await Promise.all([
    fetchAdminCountryById(id),
    fetchAdminCountryLegalProfile(id),
    fetchAdminAuthorityLinks(id),
  ]);
  const authorityLinks = authorityRes.ok ? authorityRes.data.authorityLinks : [];

  if (!countryRes.ok) {
    return (
      <>
        <PageHeader eyebrow="Country" title="Legal profile" />
        <AdminCard>
          <p className="text-sm text-[var(--color-status-error-text)]">
            {countryRes.message}
          </p>
        </AdminCard>
      </>
    );
  }

  const c = countryRes.data.country;
  const p = profileRes.ok ? (profileRes.data.legalProfile ?? null) : null;
  const { locales: disclaimerLocales, defaultLocale: disclaimerDefaultLocale } =
    resolveCountryLocaleTabs(c);

  async function saveLegalProfileAction(formData: FormData) {
    "use server";
    await requireAdminAction();

    function str(key: string) {
      const v = formData.get(key);
      return typeof v === "string" && v.trim() !== "" ? v.trim() : null;
    }

    // Medical-disclaimer tabs submit `tr_<LOCALE>_shortDisclaimer` /
    // `tr_<LOCALE>_fullDisclaimer`. The default-locale tab seeds the base
    // columns; every other locale becomes a per-locale override (the backend
    // removes rows whose fields are both blank).
    const upperDefault = disclaimerDefaultLocale.toUpperCase();
    const trLocales = new Set<string>();
    for (const key of formData.keys()) {
      const m = /^tr_([A-Za-z]{2,})_(short|full)Disclaimer$/.exec(key);
      if (m) trLocales.add(m[1].toUpperCase());
    }
    let baseShortDisclaimer: string | null = null;
    let baseFullDisclaimer: string | null = null;
    const disclaimerTranslations: Array<{
      locale: string;
      shortDisclaimer: string | null;
      fullDisclaimer: string | null;
    }> = [];
    for (const loc of trLocales) {
      const short = str(`tr_${loc}_shortDisclaimer`);
      const full = str(`tr_${loc}_fullDisclaimer`);
      if (loc === upperDefault) {
        baseShortDisclaimer = short;
        baseFullDisclaimer = full;
      } else {
        disclaimerTranslations.push({ locale: loc, shortDisclaimer: short, fullDisclaimer: full });
      }
    }

    function strArr(key: string): string[] {
      const v = formData.get(key);
      if (typeof v !== "string" || v.trim() === "") return [];
      return v
        .split(/[\n,]+/)
        .map((s) => s.trim())
        .filter(Boolean);
    }

    const body = {
      legalCompanyName: str("legalCompanyName"),
      legalAddress: str("legalAddress"),
      publicPhones: strArr("publicPhones"),
      publicEmails: strArr("publicEmails"),
      supportEmail: str("supportEmail"),
      billingEmail: str("billingEmail"),
      companyRegistrationNumber: str("companyRegistrationNumber"),
      taxVatNumber: str("taxVatNumber"),
      medicalRegistrationNumber: str("medicalRegistrationNumber"),
      healthcareLicenseDetails: str("healthcareLicenseDetails"),
      regulatorName: str("regulatorName"),
      regulatorWebsite: str("regulatorWebsite"),
      providerRegistrationLabel: str("providerRegistrationLabel"),
      providerRegistrationNumber: str("providerRegistrationNumber"),
      providerRegistrationUrl: str("providerRegistrationUrl"),
      emergencyNumber: str("emergencyNumber"),
      emergencyNotice: str("emergencyNotice"),
      nonEmergencyHealthLine: str("nonEmergencyHealthLine"),
      companyRegistryUrl: str("companyRegistryUrl"),
      medicalRegulatorUrl: str("medicalRegulatorUrl"),
      healthcareAuthorityUrl: str("healthcareAuthorityUrl"),
      dataProtectionAuthorityUrl: str("dataProtectionAuthorityUrl"),
      disputeResolutionUrl: str("disputeResolutionUrl"),
      consumerProtectionUrl: str("consumerProtectionUrl"),
      dataProtectionLawName: str("dataProtectionLawName"),
      dataProtectionPolicyTitle: str("dataProtectionPolicyTitle"),
      dpoName: str("dpoName"),
      dpoEmail: str("dpoEmail"),
      disputeBodyName: str("disputeBodyName"),
      disputeEmail: str("disputeEmail"),
      disputePhone: str("disputePhone"),
      disputeProcessText: str("disputeProcessText"),
      legalJurisdictionText: str("legalJurisdictionText"),
      consumerRightsText: str("consumerRightsText"),
      shortDisclaimer: baseShortDisclaimer,
      fullDisclaimer: baseFullDisclaimer,
      disclaimerTranslations,
    };

    const result = await putAdminCountryLegalProfile(id, body);
    if (!result.ok) {
      redirect(`/admin/countries/${id}/legal?error=${encodeURIComponent(result.message)}`);
    }
    revalidatePath(`/admin/countries/${id}/legal`);
    revalidateTag(countryLegalCacheTag(c.code), "max");
    redirect(`/admin/countries/${id}/legal?success=Legal+profile+saved`);
  }

  return (
    <>
      <Link
        href={`/admin/countries/${id}`}
        className="mb-4 inline-flex items-center gap-1.5 text-[13px] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
      >
        <ArrowLeft className="size-3.5" />
        Back to {c.name}
      </Link>

      <PageHeader
        eyebrow={
          <span className="inline-flex items-center gap-2">
            <FlagBadge code={c.code} size={14} />
            {c.name}
          </span>
        }
        title="Legal profile"
        description="Company details, regulatory registration, backlinks, and dispute resolution info used in legal pages."
        actions={
          <Btn href={`/admin/countries/${id}/legal-documents`} variant="soft" size="md">
            Legal documents →
          </Btn>
        }
      />

      {sp.error ? (
        <p className="gh-status-warning mb-4 rounded-[var(--radius-card-sm)] border px-4 py-3 text-sm">
          {sp.error}
        </p>
      ) : null}
      {sp.success ? (
        <p className="gh-status-success mb-4 rounded-[var(--radius-card-sm)] border px-4 py-3 text-sm">
          {sp.success}
        </p>
      ) : null}

      <form action={saveLegalProfileAction} className="gh-admin-country-legal-form grid gap-4">
        {/* Medical Disclaimer */}
        <AdminCard>
          <SectionTitle>Medical Disclaimer</SectionTitle>
          <p className="mt-1 text-[12px] text-[var(--color-text-muted)]">
            Country-specific medical/legal disclaimer copy, per language. The
            short version is embedded on service pages, the GP listing, the
            booking consent step and doctor profiles; the full version is shown
            on the standalone legal page and linked from the footer. The{" "}
            <span className="font-semibold">default-language</span> tab is the
            fallback — other languages use it when a field is left blank.
          </p>
          <div className="mt-4">
            <DisclaimerTranslationTabs
              locales={disclaimerLocales}
              defaultLocale={disclaimerDefaultLocale}
              baseFallback={{
                shortDisclaimer: p?.shortDisclaimer ?? null,
                fullDisclaimer: p?.fullDisclaimer ?? null,
              }}
              initialTranslations={p?.disclaimerTranslations ?? []}
            />
          </div>
        </AdminCard>

        {/* Company & Contact */}
        <AdminCard>
          <SectionTitle>Company &amp; Contact</SectionTitle>
          <div className="gh-admin-country-field-grid mt-4 grid gap-4 sm:grid-cols-2">
            <Field label="Legal company name" name="legalCompanyName" defaultValue={p?.legalCompanyName} />
            <Field label="Support email" name="supportEmail" type="email" defaultValue={p?.supportEmail} />
            <Field label="Billing email" name="billingEmail" type="email" defaultValue={p?.billingEmail} />
          </div>
          <div className="mt-4">
            <TextareaField
              label="Legal address"
              name="legalAddress"
              rows={3}
              defaultValue={p?.legalAddress}
            />
          </div>
          <div className="gh-admin-country-field-grid mt-4 grid gap-4 sm:grid-cols-2">
            <TextareaField
              label="Public phones (one per line)"
              name="publicPhones"
              rows={3}
              defaultValue={p?.publicPhones?.join("\n")}
              hint="One phone number per line"
            />
            <TextareaField
              label="Public emails (one per line)"
              name="publicEmails"
              rows={3}
              defaultValue={p?.publicEmails?.join("\n")}
              hint="One email per line"
            />
          </div>
        </AdminCard>

        {/* Registration & Regulatory */}
        <AdminCard>
          <SectionTitle>Registration &amp; Regulatory</SectionTitle>
          <div className="gh-admin-country-field-grid mt-4 grid gap-4 sm:grid-cols-2">
            <Field label="Company registration number" name="companyRegistrationNumber" defaultValue={p?.companyRegistrationNumber} />
            <Field label="Tax / VAT number" name="taxVatNumber" defaultValue={p?.taxVatNumber} />
            <Field label="Medical registration number" name="medicalRegistrationNumber" defaultValue={p?.medicalRegistrationNumber} />
            <Field label="Regulator name" name="regulatorName" defaultValue={p?.regulatorName} />
            <Field label="Regulator website" name="regulatorWebsite" type="url" defaultValue={p?.regulatorWebsite} />
            <Field label="Provider registration label" name="providerRegistrationLabel" defaultValue={p?.providerRegistrationLabel} placeholder="Registado na Entidade Reguladora da Saúde" />
            <Field label="Provider registration number" name="providerRegistrationNumber" defaultValue={p?.providerRegistrationNumber} placeholder="E179287" />
            <Field label="Provider registration URL" name="providerRegistrationUrl" type="url" defaultValue={p?.providerRegistrationUrl} />
            <Field label="Emergency number" name="emergencyNumber" defaultValue={p?.emergencyNumber ?? "112"} placeholder="112" />
            <Field label="Emergency notice" name="emergencyNotice" defaultValue={p?.emergencyNotice} placeholder="In a medical emergency call 112 immediately…" />
            <Field label="Non-emergency health line" name="nonEmergencyHealthLine" defaultValue={p?.nonEmergencyHealthLine} placeholder="SNS 24: 1414" />
          </div>
          <div className="mt-4">
            <TextareaField
              label="Healthcare license details"
              name="healthcareLicenseDetails"
              rows={3}
              defaultValue={p?.healthcareLicenseDetails}
            />
          </div>
        </AdminCard>

        {/* Legal Backlinks */}
        <AdminCard>
          <SectionTitle>Legal Backlinks</SectionTitle>
          <p className="mt-1 text-[12px] text-[var(--color-text-muted)]">
            URLs linked from legal pages / footer for regulatory transparency.
          </p>
          <div className="gh-admin-country-field-grid mt-4 grid gap-4 sm:grid-cols-2">
            <Field label="Company registry URL" name="companyRegistryUrl" type="url" defaultValue={p?.companyRegistryUrl} />
            <Field label="Medical regulator URL" name="medicalRegulatorUrl" type="url" defaultValue={p?.medicalRegulatorUrl} />
            <Field label="Healthcare authority URL" name="healthcareAuthorityUrl" type="url" defaultValue={p?.healthcareAuthorityUrl} />
            <Field label="Data protection authority URL" name="dataProtectionAuthorityUrl" type="url" defaultValue={p?.dataProtectionAuthorityUrl} />
            <Field label="Dispute resolution URL" name="disputeResolutionUrl" type="url" defaultValue={p?.disputeResolutionUrl} />
            <Field label="Consumer protection URL" name="consumerProtectionUrl" type="url" defaultValue={p?.consumerProtectionUrl} />
          </div>
        </AdminCard>

        {/* Data Protection */}
        <AdminCard>
          <SectionTitle>Data Protection</SectionTitle>
          <p className="mt-1 text-[12px] text-[var(--color-text-muted)]">
            Override &ldquo;GDPR&rdquo; with the country-specific law name (e.g. LGPD for Brazil).
          </p>
          <div className="gh-admin-country-field-grid mt-4 grid gap-4 sm:grid-cols-2">
            <Field label="Data protection law name" name="dataProtectionLawName" defaultValue={p?.dataProtectionLawName ?? "GDPR"} placeholder="GDPR" />
            <Field label="Policy page title" name="dataProtectionPolicyTitle" defaultValue={p?.dataProtectionPolicyTitle} />
            <Field label="DPO name" name="dpoName" defaultValue={p?.dpoName} />
            <Field label="DPO email" name="dpoEmail" type="email" defaultValue={p?.dpoEmail} />
          </div>
        </AdminCard>

        {/* Dispute Resolution */}
        <AdminCard>
          <SectionTitle>Dispute Resolution</SectionTitle>
          <div className="gh-admin-country-field-grid mt-4 grid gap-4 sm:grid-cols-2">
            <Field label="Dispute body name" name="disputeBodyName" defaultValue={p?.disputeBodyName} />
            <Field label="Dispute email" name="disputeEmail" type="email" defaultValue={p?.disputeEmail} />
            <label className="flex flex-col gap-1">
              <span className="gh-field-label">Dispute phone</span>
              <PhoneField name="disputePhone" defaultValue={p?.disputePhone ?? ""} />
            </label>
          </div>
          <div className="gh-admin-country-field-grid gh-admin-country-field-grid--single mt-4 grid gap-4">
            <TextareaField
              label="Dispute process description"
              name="disputeProcessText"
              rows={4}
              defaultValue={p?.disputeProcessText}
            />
            <TextareaField
              label="Legal jurisdiction text"
              name="legalJurisdictionText"
              rows={4}
              defaultValue={p?.legalJurisdictionText}
            />
            <TextareaField
              label="Consumer rights text"
              name="consumerRightsText"
              rows={4}
              defaultValue={p?.consumerRightsText}
            />
          </div>
        </AdminCard>

        <div className="gh-admin-country-actions flex justify-end">
          <button type="submit" className="gh-btn gh-btn-primary">
            Save legal profile
          </button>
        </div>
      </form>

      <div className="gh-admin-country-authority-wrap mt-4">
        <AuthorityLinksManager countryId={id} countryCode={c.code} rows={authorityLinks} />
      </div>
    </>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3
      className="m-0 text-[var(--color-text-primary)]"
      style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 800 }}
    >
      {children}
    </h3>
  );
}

function Field({
  label,
  name,
  type = "text",
  defaultValue,
  placeholder,
}: {
  label: string;
  name: string;
  type?: string;
  defaultValue?: string | null;
  placeholder?: string;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="gh-field-label">{label}</span>
      <input
        type={type}
        name={name}
        defaultValue={defaultValue ?? ""}
        placeholder={placeholder}
        className="gh-input"
      />
    </label>
  );
}

function TextareaField({
  label,
  name,
  rows = 3,
  defaultValue,
  hint,
}: {
  label: string;
  name: string;
  rows?: number;
  defaultValue?: string | null;
  hint?: string;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="gh-field-label">{label}</span>
      <textarea
        name={name}
        rows={rows}
        defaultValue={defaultValue ?? ""}
        className="gh-input resize-y"
      />
      {hint ? <span className="text-[11px] text-[var(--color-text-muted)]">{hint}</span> : null}
    </label>
  );
}
