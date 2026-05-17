"use client";

import { ChatThread } from "@/components/chat/ChatThread";
import { fetchAdminMessages, postAdminMessage } from "@/lib/api/chat-api";

type Props = {
  appointmentId: string;
};

/** Client wrapper so the server page does not pass functions into ChatThread. */
export function AdminAppointmentChat({ appointmentId }: Props) {
  return (
    <ChatThread
      appointmentId={appointmentId}
      viewerRole="ADMIN"
      fetcher={fetchAdminMessages}
      poster={postAdminMessage}
    />
  );
}
