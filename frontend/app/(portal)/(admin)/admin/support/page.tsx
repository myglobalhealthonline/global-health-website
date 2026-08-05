import { fetchAdminSupportThreads } from "@/lib/admin/admin-api";
import { AdminCard, PageHeader, Pill } from "@/components/portal-atoms";
import { AdminSupportInbox } from "./inbox";

export const dynamic = "force-dynamic";

type Props = { searchParams?: Promise<{ open?: string }> };

/**
 * Doctor support inbox. Deliberately a separate page rather than a third tab on
 * /admin/messages: that inbox is built entirely around appointmentId /
 * orderNumber / patientName, and a support thread is doctor-keyed with no
 * appointment at all.
 *
 * `?open=<threadId>` is the deep link the "doctor has sent a text" alert email
 * lands on.
 */
export default async function AdminSupportPage({ searchParams }: Props) {
  const sp = searchParams ? await searchParams : {};
  const result = await fetchAdminSupportThreads();

  if (!result.ok) {
    return (
      <>
        <PageHeader eyebrow="Support" title="Doctor support" />
        <AdminCard>
          <p className="gh-status-warning rounded-[var(--radius-card-sm)] border px-4 py-3 text-sm">
            Could not load support threads: {result.message}
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
        eyebrow="Support"
        title="Doctor support"
        description="Doctors' direct line to the operations team. Any admin can reply — your first name is shown to the doctor so they know who answered."
        actions={totalUnread > 0 ? <Pill tone="brand">{totalUnread} unread</Pill> : null}
      />
      <AdminSupportInbox
        threads={threads}
        viewerUserId={result.data.viewerUserId}
        initialSelectedId={sp.open ?? null}
      />
    </>
  );
}
