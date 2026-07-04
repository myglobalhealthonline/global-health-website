import { MessagesShell } from "./ui";
import { fetchAccountAppointments } from "@/lib/api/account-appointments-api";
import { PageHeader } from "@/components/portal-atoms";

export const dynamic = "force-dynamic";

export default async function AccountMessagesPage() {
  const history = await fetchAccountAppointments();
  const items = history.ok ? history.data.items : [];

  return (
    <div className="gh-patient-page">
      <PageHeader
        eyebrow="Messages"
        title="Your conversations"
        description="Message the clinic about any booking, and chat with your doctor once the booking is paid."
      />
      <MessagesShell
        items={items}
        unavailableMessage={history.ok ? null : "Messages are unavailable right now."}
      />
    </div>
  );
}
