import { fetchDoctorMessageThreads } from "@/lib/api/doctor-api";
import { AdminCard, PageHeader, Pill } from "@/components/portal-atoms";
import { DoctorMessagesInbox } from "./inbox";

export const dynamic = "force-dynamic";

type Props = { searchParams?: Promise<{ open?: string }> };

export default async function DoctorMessagesPage({ searchParams }: Props) {
  const sp = searchParams ? await searchParams : {};
  const result = await fetchDoctorMessageThreads();

  if (!result.ok) {
    return (
      <>
        <PageHeader eyebrow="Messages" title="Patient messages" />
        <AdminCard>
          <p className="gh-status-warning rounded-[var(--radius-card-sm)] border px-4 py-3 text-sm">
            Could not load conversations: {result.message}
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
        eyebrow="Messages"
        title="Patient messages"
        description="Your consultation chats with patients. Click a thread to read and reply in place; the order number opens the appointment."
        actions={totalUnread > 0 ? <Pill tone="brand">{totalUnread} unread</Pill> : null}
      />
      <DoctorMessagesInbox threads={threads} initialSelectedId={sp.open ?? null} />
    </>
  );
}
