import { ScrollText } from "lucide-react";
import { fetchDoctorConfidentialityAgreement } from "@/lib/api/doctor-api";
import { PageHeader } from "@/components/portal-atoms";
import { ConfidentialityForm } from "./_components/confidentiality-form";
import { SignedCopyPanel } from "./_components/signed-copy-panel";
import { getPortalLocale } from "@/lib/i18n/get-portal-locale";
import { loadLocaleBundle } from "@/lib/i18n/load-locale";

export const dynamic = "force-dynamic";

export default async function DoctorConfidentialityPage() {
  const locale = await getPortalLocale();
  const { doctor: d } = loadLocaleBundle(locale);
  const result = await fetchDoctorConfidentialityAgreement();

  if (!result.ok) {
    return (
      <div className="gh-card p-6">
        <p className="gh-status-warning rounded-md border px-4 py-3 text-sm">{result.message}</p>
      </div>
    );
  }

  return (
    <>
      <PageHeader
        eyebrow={d.confidentiality.eyebrow}
        title={
          <span className="flex items-center gap-2">
            <ScrollText className="size-6 text-[var(--portal-primary)]" aria-hidden />
            {d.confidentiality.title}
          </span>
        }
        description={
          result.data.accepted
            ? d.confidentiality.descriptionAccepted.replace(
                "{version}",
                String(result.data.currentVersion),
              )
            : d.confidentiality.descriptionVersion.replace(
                "{version}",
                String(result.data.currentVersion),
              )
        }
      />

      <ConfidentialityForm
        accepted={result.data.accepted}
        acceptedAt={result.data.acceptedAt}
        agreementText={result.data.agreementText}
        strings={d.confidentiality}
      />

      <SignedCopyPanel strings={d.confidentiality} />
    </>
  );
}
