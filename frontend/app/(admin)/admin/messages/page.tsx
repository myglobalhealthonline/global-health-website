import { fetchAdminMessageThreads } from "@/lib/admin/admin-api";
import { AdminCard, PageHeader, Pill } from "../_components/atoms";
import { AdminMessagesInbox } from "./inbox";

export const dynamic = "force-dynamic";

type Props = { searchParams?: Promise<{ open?: string }> };

export default async function AdminMessagesPage({ searchParams }: Props) {
  const sp = searchParams ? await searchParams : {};
  const result = await fetchAdminMessageThreads();

  if (!result.ok) {
    return (
      <>
        <PageHeader eyebrow="Messages" title="Patient messages" />
        <AdminCard>
          <p className="gh-status-warning rounded-[var(--radius-card-sm)] border px-4 py-3 text-sm">
            Could not load message threads: {result.message}
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
        description="Every patient ↔ clinic conversation. Click a thread to read and reply in place; the order number opens the full appointment."
        actions={totalUnread > 0 ? <Pill tone="brand">{totalUnread} unread</Pill> : null}
      />
      <AdminMessagesInbox threads={threads} initialSelectedId={sp.open ?? null} />
    </>
  );
}
