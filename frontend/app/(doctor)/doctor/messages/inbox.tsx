"use client";

import { MessagesInbox, type InboxThread } from "@/components/messages/MessagesInbox";
import { ConsultationChat } from "@/components/chat/ConsultationChat";
import {
  fetchDoctorChat,
  postDoctorMessage,
  uploadDoctorChatFile,
} from "@/lib/api/consultation-chat-api";
import type { DoctorMessageThread } from "@/lib/api/doctor-api";

type MessagesPageStrings = Record<string, string>;

export function DoctorMessagesInbox({
  threads,
  initialSelectedId,
  strings: s,
}: {
  threads: DoctorMessageThread[];
  initialSelectedId?: string | null;
  strings: MessagesPageStrings;
}) {
  const items: InboxThread[] = threads.map((t) => ({
    id: t.appointmentId,
    orderNumber: t.orderNumber,
    orderHref: `/doctor/appointments/${t.appointmentId}?tab=messages#patient-chat`,
    name: t.patientName,
    subtitle: `${t.countryCode} · ${t.consultationType}`,
    preview: t.lastMessage
      ? `${t.lastMessage.authorRole === "PATIENT" ? s.patientPrefix : s.youPrefix}${t.lastMessage.body ?? ""}`
      : null,
    timestamp: t.lastMessage?.createdAt ?? null,
    unreadCount: t.unreadCount,
  }));

  return (
    <MessagesInbox
      threads={items}
      initialSelectedId={initialSelectedId}
      renderChat={(thread) => (
        <ConsultationChat
          appointmentId={thread.id}
          viewerRole="DOCTOR"
          fetcher={fetchDoctorChat}
          poster={postDoctorMessage}
          fileUploader={uploadDoctorChatFile}
          variant="embedded"
        />
      )}
      emptyTitle={s.emptyTitle}
      emptyDescription={s.emptyDescription}
    />
  );
}
