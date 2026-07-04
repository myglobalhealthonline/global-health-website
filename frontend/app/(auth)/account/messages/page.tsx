import { MessagesShell } from "./ui";
import {
  fetchAccountAppointments,
  fetchAccountMessageUnread,
} from "@/lib/api/account-appointments-api";
import { PageHeader } from "@/components/portal-atoms";

export const dynamic = "force-dynamic";

type Props = {
  searchParams?: Promise<{ open?: string; channel?: string }>;
};

export default async function AccountMessagesPage({ searchParams }: Props) {
  const sp = searchParams ? await searchParams : {};
  const [history, unreadById] = await Promise.all([
    fetchAccountAppointments(),
    fetchAccountMessageUnread(),
  ]);
  const items = history.ok ? history.data.items : [];
  const openChannel = sp.channel === "doctor" ? "doctor" : "clinic";

  return (
    <div className="gh-patient-page">
      <PageHeader
        eyebrow="Messages"
        title="Your conversations"
        description="Message the clinic about any booking, and chat with your doctor once the booking is paid."
      />
      <MessagesShell
        items={items}
        unreadById={unreadById}
        initialOpenId={sp.open ?? null}
        initialOpenChannel={openChannel}
        unavailableMessage={history.ok ? null : "Messages are unavailable right now."}
      />
    </div>
  );
}
