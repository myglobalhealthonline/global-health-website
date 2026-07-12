import { Stethoscope } from "lucide-react";
import { fetchDoctorServices } from "@/lib/api/doctor-api";
import { AdminCard, PageHeader } from "@/components/portal-atoms";
import { DoctorServiceSelectionForm } from "./_components/service-selection-form";
import { getPageLocale } from "@/lib/i18n/get-page-locale";
import { loadLocaleBundle } from "@/lib/i18n/load-locale";

export const dynamic = "force-dynamic";

export default async function DoctorServicesPage() {
  const [result, locale] = await Promise.all([fetchDoctorServices(), getPageLocale()]);
  const { doctor: d } = loadLocaleBundle(locale);

  if (!result.ok) {
    return (
      <>
        <PageHeader
          eyebrow={
            <span className="inline-flex items-center gap-2">
              <Stethoscope className="size-3.5" aria-hidden /> {d.services.eyebrow}
            </span>
          }
          title={d.services.title}
        />
        <AdminCard>
          <p className="gh-status-warning rounded-md border px-4 py-3 text-sm">
            {result.message}
          </p>
        </AdminCard>
      </>
    );
  }
  const description = (
    <>
      {d.services.description} {d.services.explainerIntro}{" "}
      {result.data.approvalRequired ? (
        <>
          {d.services.explainerApprovalRequired}
          <span className="font-semibold">{" "}{d.services.explainerApproved}</span>{" "}
          {d.services.explainerBecomeBookable}{" "}
          <span className="font-semibold">{d.services.explainerRejected}</span>.
        </>
      ) : (
        d.services.explainerNoApproval
      )}{" "}
      {d.services.explainerHealthTests}
    </>
  );

  return (
    <>
      <PageHeader
        eyebrow={
          <span className="inline-flex items-center gap-2">
            <Stethoscope className="size-3.5" aria-hidden /> {d.services.eyebrow}
          </span>
        }
        title={d.services.title}
        description={description}
      />

      <DoctorServiceSelectionForm
        approvalRequired={result.data.approvalRequired}
        items={result.data.items}
        strings={d.services}
        common={d.common}
      />
    </>
  );
}
