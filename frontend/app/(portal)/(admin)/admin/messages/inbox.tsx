"use client";

import { useState } from "react";
import { MessagesInbox, type InboxThread } from "@/components/messages/MessagesInbox";
import { PortalTabs } from "@/components/PortalTabs";
import { ChatThread } from "@/components/chat/ChatThread";
import { fetchAdminMessages, postAdminMessage } from "@/lib/api/chat-api";
import type {
  AdminMessageThread,
  AdminInternalMessageThread,
} from "@/lib/admin/admin-api";
import { FlagBadge } from "../_components/flag-badge";
import { AdminInternalThread } from "./internal-thread";
import { MarkAppointmentNotificationsRead } from "./mark-read";

export type AdminMessagesTab = "patient" | "internal";

/**
 * Two-channel admin inbox.
 *
 * - "Patient" — patient ↔ clinic `Message` threads (the original inbox).
 * - "Internal notes" — doctor ↔ admin `InternalMessage` threads. These used
 *   to be reachable only from the appointment record, so an INTERNAL_MESSAGE
 *   bell item had nowhere sensible to land; the bell now deep-links here
 *   with `?tab=internal&open=<appointmentId>`.
 */
export function AdminMessagesInbox({
  threads,
  internalThreads,
  initialSelectedId,
  initialTab = "patient",
}: {
  threads: AdminMessageThread[];
  internalThreads: AdminInternalMessageThread[];
  initialSelectedId?: string | null;
  initialTab?: AdminMessagesTab;
}) {
  const [tab, setTab] = useState<AdminMessagesTab>(initialTab);

  const patientItems: InboxThread[] = threads.map((t) => ({
    id: t.appointmentId,
    orderNumber: t.orderNumber,
    orderHref: `/admin/appointments/${t.appointmentId}?tab=messages#patient-chat`,
    name: t.patientName,
    subtitle: `${t.consultationType}${t.patientEmail ? ` · ${t.patientEmail}` : ""}`,
    preview: t.lastMessage
      ? `${t.lastMessage.authorRole === "PATIENT" ? "Patient: " : "You: "}${t.lastMessage.body}`
      : null,
    timestamp: t.lastMessage?.createdAt ?? null,
    unreadCount: t.unreadCount,
    tag: <FlagBadge code={t.countryCode} size={12} />,
  }));

  const internalItems: InboxThread[] = internalThreads.map((t) => ({
    id: t.appointmentId,
    orderNumber: t.orderNumber,
    orderHref: `/admin/appointments/${t.appointmentId}?tab=messages#internal-notes`,
    name: t.patientName,
    // Internal threads are staff-to-staff *about* a patient, so the doctor —
    // the other side of the conversation — is the useful secondary line.
    subtitle: `${t.doctorName ? `Dr ${t.doctorName}` : "Unassigned"} · ${t.consultationType}`,
    preview: t.lastMessage
      ? `${t.lastMessage.authorRole === "DOCTOR" ? "Doctor" : "Admin"} ${t.lastMessage.authorName}: ${t.lastMessage.body}`
      : null,
    timestamp: t.lastMessage?.createdAt ?? null,
    unreadCount: t.unreadCount,
    tag: <FlagBadge code={t.countryCode} size={12} />,
  }));

  const patientUnread = threads.reduce((sum, t) => sum + t.unreadCount, 0);
  const internalUnread = internalThreads.reduce((sum, t) => sum + t.unreadCount, 0);

  return (
    <>
      <PortalTabs
        ariaLabel="Message channels"
        className="mb-4"
        value={tab}
        onChange={(next) => setTab(next as AdminMessagesTab)}
        syncParam="tab"
        items={[
          {
            value: "patient",
            label: "Patient",
            badge: patientUnread > 0 ? patientUnread : null,
            badgeAlert: patientUnread > 0,
          },
          {
            value: "internal",
            label: "Internal notes",
            badge: internalUnread > 0 ? internalUnread : null,
            badgeAlert: internalUnread > 0,
          },
        ]}
      />

      {tab === "patient" ? (
        <MessagesInbox
          threads={patientItems}
          initialSelectedId={initialTab === "patient" ? initialSelectedId : null}
          renderChat={(thread) => (
            <>
              <MarkAppointmentNotificationsRead appointmentId={thread.id} />
              <ChatThread
                appointmentId={thread.id}
                viewerRole="ADMIN"
                fetcher={fetchAdminMessages}
                poster={postAdminMessage}
                variant="embedded"
              />
            </>
          )}
          emptyTitle="No patient messages yet"
          emptyDescription="When a patient messages the clinic from their booking, the conversation shows up here."
        />
      ) : (
        <MessagesInbox
          threads={internalItems}
          initialSelectedId={initialTab === "internal" ? initialSelectedId : null}
          renderChat={(thread) => (
            <>
              <MarkAppointmentNotificationsRead appointmentId={thread.id} />
              {/* Keyed so switching threads remounts the loader instead of
                  briefly showing the previous thread's notes. */}
              <AdminInternalThread key={thread.id} appointmentId={thread.id} />
            </>
          )}
          emptyTitle="No internal notes yet"
          emptyDescription="Notes exchanged with doctors about a specific appointment show up here. The patient never sees them."
          selectConversationTitle="Select a thread"
          selectConversationBody="Choose an appointment on the left to read and reply to its internal notes."
        />
      )}
    </>
  );
}
