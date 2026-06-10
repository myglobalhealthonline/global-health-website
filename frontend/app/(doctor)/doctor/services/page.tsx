import { Stethoscope } from "lucide-react";
import { fetchDoctorServices } from "@/lib/api/doctor-api";
import { AdminCard, PageHeader } from "@/components/portal-atoms";
import { DoctorServiceSelectionForm } from "./_components/service-selection-form";

export const dynamic = "force-dynamic";

export default async function DoctorServicesPage() {
  const result = await fetchDoctorServices();

  if (!result.ok) {
    return (
      <>
        <PageHeader
          eyebrow={
            <span className="inline-flex items-center gap-2">
              <Stethoscope className="size-3.5" aria-hidden /> Practice
            </span>
          }
          title="My services"
        />
        <AdminCard>
          <p className="gh-status-warning rounded-md border px-4 py-3 text-sm">
            {result.message}
          </p>
        </AdminCard>
      </>
    );
  }

  return (
    <>
      <PageHeader
        eyebrow={
          <span className="inline-flex items-center gap-2">
            <Stethoscope className="size-3.5" aria-hidden /> Practice
          </span>
        }
        title="My services"
        description="Choose the GP, specialist, and prescription services you are qualified to provide. Patients can only book you for services you have selected."
      />

      <DoctorServiceSelectionForm
        approvalRequired={result.data.approvalRequired}
        items={result.data.items}
      />
    </>
  );
}
