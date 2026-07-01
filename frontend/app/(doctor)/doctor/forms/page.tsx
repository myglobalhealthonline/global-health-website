import { fetchDoctorFormTemplates } from "@/lib/api/doctor-api";
import { AdminSummaryStrip, PageHeader } from "@/components/portal-atoms";
import { FormTemplatesClient } from "./_components/templates";

export const dynamic = "force-dynamic";

export default async function DoctorFormsPage() {
  const result = await fetchDoctorFormTemplates();

  return (
    <>
      <PageHeader
        eyebrow="Clinical templates"
        title="Forms"
        description="Reusable intake, pre-consult, and follow-up templates. Use them from the appointment workspace to capture patient answers consistently."
      />

      {result.ok ? (
        <AdminSummaryStrip
          className="mb-4"
          items={[
            {
              label: "Templates",
              value: result.data.items.length,
              hint: "Available for consultations",
              tone: "brand",
            },
            {
              label: "Workflow",
              value: "Reusable",
              hint: "Attach inside appointment detail",
              tone: "neutral",
            },
          ]}
        />
      ) : null}

      {!result.ok ? (
        <div className="gh-card p-6">
          <p className="gh-status-warning rounded-md border px-4 py-3 text-sm">
            {result.message}
          </p>
        </div>
      ) : (
        <FormTemplatesClient initial={result.data.items} />
      )}
    </>
  );
}
