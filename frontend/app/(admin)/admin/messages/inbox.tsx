"use client";

import { MessagesInbox, type InboxThread } from "@/components/messages/MessagesInbox";
import { ChatThread } from "@/components/chat/ChatThread";
import { fetchAdminMessages, postAdminMessage } from "@/lib/api/chat-api";
import type { AdminMessageThread } from "@/lib/admin/admin-api";
import { FlagBadge } from "../_components/flag-badge";

export function AdminMessagesInbox({
  threads,
  initialSelectedId,
}: {
  threads: AdminMessageThread[];
  initialSelectedId?: string | null;
}) {
  const items: InboxThread[] = threads.map((t) => ({
    id: t.appointmentId,
    orderNumber: t.orderNumber,
    orderHref: `/admin/appointments/${t.appointmentId}#patient-chat`,
    name: t.patientName,
    subtitle: `${t.consultationType}${t.patientEmail ? ` · ${t.patientEmail}` : ""}`,
    preview: t.lastMessage
      ? `${t.lastMessage.authorRole === "PATIENT" ? "Patient: " : "You: "}${t.lastMessage.body}`
      : null,
    timestamp: t.lastMessage?.createdAt ?? null,
    unreadCount: t.unreadCount,
    tag: <FlagBadge code={t.countryCode} size={12} />,
  }));

  return (
    <MessagesInbox
      threads={items}
      initialSelectedId={initialSelectedId}
      renderChat={(thread) => (
        <ChatThread
          appointmentId={thread.id}
          viewerRole="ADMIN"
          fetcher={fetchAdminMessages}
          poster={postAdminMessage}
          variant="embedded"
        />
      )}
      emptyTitle="No patient messages yet"
      emptyDescription="When a patient messages the clinic from their booking, the conversation shows up here."
    />
  );
}
