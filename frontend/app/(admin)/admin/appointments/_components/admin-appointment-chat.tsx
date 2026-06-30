"use client";

import { ChatThread } from "@/components/chat/ChatThread";
import { fetchAdminMessages, postAdminMessage } from "@/lib/api/chat-api";

type Props = {
  appointmentId: string;
};

/** Client wrapper so the server page does not pass functions into ChatThread. */
export function AdminAppointmentChat({ appointmentId }: Props) {
  return (
    <div className="gh-admin-appointment-chat">
      <ChatThread
        appointmentId={appointmentId}
        viewerRole="ADMIN"
        fetcher={fetchAdminMessages}
        poster={postAdminMessage}
      />
    </div>
  );
}
