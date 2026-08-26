import { fetchAdminSupportThreads, fetchAdminSupportDoctors } from "@/lib/admin/admin-api";
import { AdminCard, PageHeader, Pill } from "@/components/portal-atoms";
import { AdminSupportInbox } from "./inbox";
import { NewSupportThreadButton } from "./new-thread";

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
  // Parallel: the doctor picker must list every active doctor, including those
  // with no thread yet, so it can't be derived from the inbox rows.
  const [result, doctorsResult] = await Promise.all([
    fetchAdminSupportThreads(),
    fetchAdminSupportDoctors(),
  ]);
  const doctorOptions = doctorsResult.ok ? doctorsResult.data.items : [];

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
        description="Two-way line between doctors and the operations team. Either side can start the conversation; your first name is shown to the doctor so they know who wrote."
        actions={
          <div className="flex items-center gap-2">
            {totalUnread > 0 ? <Pill tone="brand">{totalUnread} unread</Pill> : null}
            {doctorOptions.length > 0 ? (
              <NewSupportThreadButton doctors={doctorOptions} />
            ) : null}
          </div>
        }
      />
      <AdminSupportInbox
        threads={threads}
        viewerUserId={result.data.viewerUserId}
        initialSelectedId={sp.open ?? null}
      />
    </>
  );
}
