"use client";

import { MessagesInbox, type InboxThread } from "@/components/messages/MessagesInbox";
import { ConsultationChat } from "@/components/chat/ConsultationChat";
import {
  fetchDoctorChat,
  postDoctorMessage,
  uploadDoctorChatFile,
} from "@/lib/api/consultation-chat-api";
import type { DoctorMessageThread } from "@/lib/api/doctor-api";

export function DoctorMessagesInbox({
  threads,
  initialSelectedId,
}: {
  threads: DoctorMessageThread[];
  initialSelectedId?: string | null;
}) {
  const items: InboxThread[] = threads.map((t) => ({
    id: t.appointmentId,
    orderNumber: t.orderNumber,
    orderHref: `/doctor/appointments/${t.appointmentId}?tab=messages#patient-chat`,
    name: t.patientName,
    subtitle: `${t.countryCode} · ${t.consultationType}`,
    preview: t.lastMessage
      ? `${t.lastMessage.authorRole === "PATIENT" ? "Patient: " : "You: "}${t.lastMessage.body ?? ""}`
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
      emptyTitle="No patient messages yet"
      emptyDescription="When a patient messages you from a paid booking, the conversation appears here."
    />
  );
}
