"use client";

import { MessagesInbox, type InboxThread } from "@/components/messages/MessagesInbox";
import { ConsultationChat } from "@/components/chat/ConsultationChat";
import {
  fetchDoctorChat,
  postDoctorMessage,
  uploadDoctorChatFile,
  toggleDoctorChatLock,
} from "@/lib/api/consultation-chat-api";
import type { DoctorMessageThread } from "@/lib/api/doctor-api";

type MessagesPageStrings = Record<string, string>;

export function DoctorMessagesInbox({
  threads,
  initialSelectedId,
  strings: s,
  consultationChatLabels,
}: {
  threads: DoctorMessageThread[];
  initialSelectedId?: string | null;
  strings: MessagesPageStrings;
  consultationChatLabels?: Record<string, string>;
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
          onToggleLock={(open) => toggleDoctorChatLock(thread.id, open)}
          variant="embedded"
          labels={consultationChatLabels}
        />
      )}
      emptyTitle={s.emptyTitle}
      emptyDescription={s.emptyDescription}
      orderFallbackLabel={s.orderFallbackLabel}
      searchPlaceholder={s.searchPlaceholder}
      noMatchesLabel={s.noMatchesLabel}
      backAriaLabel={s.backAriaLabel}
      orderLinkTitle={s.orderLinkTitle}
      selectConversationTitle={s.selectConversationTitle}
      selectConversationBody={s.selectConversationBody}
    />
  );
}
