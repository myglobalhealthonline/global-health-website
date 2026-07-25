import {
  fetchAdminMessageThreads,
  fetchAdminInternalMessageThreads,
} from "@/lib/admin/admin-api";
import { AdminCard, PageHeader, Pill } from "../_components/atoms";
import { AdminMessagesInbox, type AdminMessagesTab } from "./inbox";

export const dynamic = "force-dynamic";

type Props = { searchParams?: Promise<{ open?: string; tab?: string }> };

export default async function AdminMessagesPage({ searchParams }: Props) {
  const sp = searchParams ? await searchParams : {};
  const [result, internalResult] = await Promise.all([
    fetchAdminMessageThreads(),
    fetchAdminInternalMessageThreads(),
  ]);

  if (!result.ok) {
    return (
      <>
        <PageHeader eyebrow="Messages" title="Messages" />
        <AdminCard>
          <p className="gh-status-warning rounded-[var(--radius-card-sm)] border px-4 py-3 text-sm">
            Could not load message threads: {result.message}
          </p>
        </AdminCard>
      </>
    );
  }

  const threads = result.data.items;
  // The internal tab is secondary — a failure there degrades to an empty
  // tab rather than taking the whole inbox down with it.
  const internalThreads = internalResult.ok ? internalResult.data.items : [];
  const totalUnread =
    threads.reduce((sum, t) => sum + t.unreadCount, 0) +
    internalThreads.reduce((sum, t) => sum + t.unreadCount, 0);
  const initialTab: AdminMessagesTab = sp.tab === "internal" ? "internal" : "patient";

  return (
    <>
      <PageHeader
        eyebrow="Messages"
        title="Messages"
        description="Patient ↔ clinic conversations and doctor ↔ admin internal notes. Click a thread to read and reply in place; the order number opens the full appointment."
        actions={totalUnread > 0 ? <Pill tone="brand">{totalUnread} unread</Pill> : null}
      />
      <AdminMessagesInbox
        threads={threads}
        internalThreads={internalThreads}
        initialSelectedId={sp.open ?? null}
        initialTab={initialTab}
      />
    </>
  );
}
