import { fetchDoctorFormTemplates } from "@/lib/api/doctor-api";
import { AdminSummaryStrip, PageHeader } from "@/components/portal-atoms";
import { FormTemplatesClient } from "./_components/templates";
import { getPageLocale } from "@/lib/i18n/get-page-locale";
import { loadLocaleBundle } from "@/lib/i18n/load-locale";

export const dynamic = "force-dynamic";

export default async function DoctorFormsPage() {
  const [result, locale] = await Promise.all([fetchDoctorFormTemplates(), getPageLocale()]);
  const { doctor: d } = loadLocaleBundle(locale);

  return (
    <>
      <PageHeader
        eyebrow={d.forms.eyebrow}
        title={d.forms.title}
        description={d.forms.description}
      />

      {result.ok ? (
        <AdminSummaryStrip
          className="mb-4"
          items={[
            {
              label: d.forms.templates,
              value: result.data.items.length,
              hint: d.forms.templatesHint,
              tone: "brand",
            },
            {
              label: d.forms.workflow,
              value: d.forms.reusable,
              hint: d.forms.workflowHint,
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
        <FormTemplatesClient initial={result.data.items} strings={d.forms} />
      )}
    </>
  );
}
