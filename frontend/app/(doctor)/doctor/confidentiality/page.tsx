import { ScrollText } from "lucide-react";
import { fetchDoctorConfidentialityAgreement } from "@/lib/api/doctor-api";
import { PageHeader } from "@/components/portal-atoms";
import { ConfidentialityForm } from "./_components/confidentiality-form";

export const dynamic = "force-dynamic";

export default async function DoctorConfidentialityPage() {
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
        eyebrow="Compliance"
        title={
          <span className="flex items-center gap-2">
            <ScrollText className="size-6 text-[var(--portal-primary)]" aria-hidden />
            Confidentiality agreement
          </span>
        }
        description={`Version ${result.data.currentVersion}. Accepting this agreement is required before patient-record protections are enforced.`}
      />

      <ConfidentialityForm
        accepted={result.data.accepted}
        acceptedAt={result.data.acceptedAt}
        agreementText={result.data.agreementText}
      />
    </>
  );
}
