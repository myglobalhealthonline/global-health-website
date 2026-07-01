import { Stethoscope } from "lucide-react";
import { fetchDoctorServices } from "@/lib/api/doctor-api";
import { AdminCard, AdminSummaryStrip, PageHeader } from "@/components/portal-atoms";
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
  const active = result.data.items.filter((item) => item.assignment?.status === "active").length;
  const pending = result.data.items.filter((item) => item.assignment?.status === "pending").length;
  const selected = result.data.items.filter((item) => item.assignment != null).length;
  const countries = new Set(result.data.items.map((item) => item.countryCode)).size;

  return (
    <>
      <PageHeader
        eyebrow={
          <span className="inline-flex items-center gap-2">
            <Stethoscope className="size-3.5" aria-hidden /> Practice
          </span>
        }
        title="My services"
        description="Request the GP, specialist, and prescription services you are qualified to provide. New requests are reviewed by an administrator before patients can book them."
      />

      <AdminSummaryStrip
        className="mb-4"
        items={[
          {
            label: "Selected",
            value: selected,
            hint: "Requested or assigned",
            tone: selected > 0 ? "brand" : "warning",
          },
          {
            label: "Bookable",
            value: active,
            hint: "Active services",
            tone: active > 0 ? "success" : "neutral",
          },
          {
            label: "Awaiting approval",
            value: pending,
            hint: "Admin review",
            tone: pending > 0 ? "warning" : "neutral",
          },
          {
            label: "Markets",
            value: countries,
            hint: "Service countries",
            tone: "neutral",
          },
        ]}
      />

      <DoctorServiceSelectionForm
        approvalRequired={result.data.approvalRequired}
        items={result.data.items}
      />
    </>
  );
}
