import { fetchDoctorSupportThread } from "@/lib/api/doctor-api";
import { AdminCard, PageHeader } from "@/components/portal-atoms";
import { getPortalLocale } from "@/lib/i18n/get-portal-locale";
import { loadLocaleBundle } from "@/lib/i18n/load-locale";
import { DoctorSupportChat } from "./support-chat-client";

export const dynamic = "force-dynamic";

/**
 * Doctor → support chat. One standing thread per doctor, answered by any admin.
 *
 * Server-rendered first paint so the thread is there on load; the client
 * component then polls the same-origin proxy for replies.
 */
export default async function DoctorSupportPage() {
  const locale = await getPortalLocale();
  const { doctor: d } = loadLocaleBundle(locale);
  const result = await fetchDoctorSupportThread();

  return (
    <>
      <PageHeader
        eyebrow={d.supportPage.eyebrow}
        title={d.supportPage.title}
        description={d.supportPage.description}
      />
      {result.ok ? (
        <DoctorSupportChat
          initialItems={result.data.items}
          labels={d.supportChat}
        />
      ) : (
        <AdminCard>
          <p className="gh-status-warning rounded-[var(--radius-card-sm)] border px-4 py-3 text-sm">
            {d.supportPage.loadError.replace("{message}", result.message)}
          </p>
        </AdminCard>
      )}
    </>
  );
}
