import { fetchDoctorMessageThreads } from "@/lib/api/doctor-api";
import { AdminCard, PageHeader, Pill } from "@/components/portal-atoms";
import { DoctorMessagesInbox } from "./inbox";
import { getPageLocale } from "@/lib/i18n/get-page-locale";
import { loadLocaleBundle } from "@/lib/i18n/load-locale";

export const dynamic = "force-dynamic";

type Props = { searchParams?: Promise<{ open?: string }> };

export default async function DoctorMessagesPage({ searchParams }: Props) {
  const locale = await getPageLocale();
  const { doctor: d } = loadLocaleBundle(locale);
  const sp = searchParams ? await searchParams : {};
  const result = await fetchDoctorMessageThreads();

  if (!result.ok) {
    return (
      <>
        <PageHeader eyebrow={d.messagesPage.eyebrow} title={d.messagesPage.title} />
        <AdminCard>
          <p className="gh-status-warning rounded-[var(--radius-card-sm)] border px-4 py-3 text-sm">
            {d.messagesPage.loadError.replace("{message}", result.message)}
          </p>
        </AdminCard>
      </>
    );
  }

  const threads = result.data.items;
  const totalUnread = threads.reduce((sum, t) => sum + t.unreadCount, 0);

  return (
    <>
      <PageHeader
        eyebrow={d.messagesPage.eyebrow}
        title={d.messagesPage.title}
        description={d.messagesPage.description}
        actions={
          totalUnread > 0 ? (
            <Pill tone="brand">{d.messagesPage.unreadPill.replace("{count}", String(totalUnread))}</Pill>
          ) : null
        }
      />
      <DoctorMessagesInbox
        threads={threads}
        initialSelectedId={sp.open ?? null}
        strings={d.messagesPage}
      />
    </>
  );
}
