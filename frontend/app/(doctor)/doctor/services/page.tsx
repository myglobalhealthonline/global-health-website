import { Stethoscope } from "lucide-react";
import { fetchDoctorServices } from "@/lib/api/doctor-api";
import { AdminCard, AdminSummaryStrip, PageHeader } from "@/components/portal-atoms";
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
  const active = result.data.items.filter((item) => item.assignment?.status === "active").length;
  const pending = result.data.items.filter((item) => item.assignment?.status === "pending").length;
  const selected = result.data.items.filter((item) => item.assignment != null).length;
  const countries = new Set(result.data.items.map((item) => item.countryCode)).size;

  return (
    <>
      <PageHeader
        eyebrow={
          <span className="inline-flex items-center gap-2">
            <Stethoscope className="size-3.5" aria-hidden /> {d.services.eyebrow}
          </span>
        }
        title={d.services.title}
        description={d.services.description}
      />

      <AdminSummaryStrip
        className="mb-4"
        items={[
          {
            label: d.services.selected,
            value: selected,
            hint: d.services.selectedHint,
            tone: selected > 0 ? "brand" : "warning",
          },
          {
            label: d.services.bookable,
            value: active,
            hint: d.services.bookableHint,
            tone: active > 0 ? "success" : "neutral",
          },
          {
            label: d.services.awaitingApproval,
            value: pending,
            hint: d.services.awaitingHint,
            tone: pending > 0 ? "warning" : "neutral",
          },
          {
            label: d.services.markets,
            value: countries,
            hint: d.services.marketsHint,
            tone: "neutral",
          },
        ]}
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
