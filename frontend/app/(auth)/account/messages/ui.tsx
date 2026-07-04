"use client";

import { useState } from "react";
import { MessageCircle, Stethoscope } from "lucide-react";
import type {
  AccountAppointment,
  AccountThreadUnread,
} from "@/lib/api/account-appointments-api";
import { MessagesInbox, type InboxThread } from "@/components/messages/MessagesInbox";
import { ChatThread } from "@/components/chat/ChatThread";
import { fetchPatientMessages, postPatientMessage } from "@/lib/api/chat-api";
import { ConsultationChat } from "@/components/chat/ConsultationChat";
import {
  fetchPatientChat,
  postPatientMessage as postPatientChatMessage,
  uploadPatientChatFile,
} from "@/lib/api/consultation-chat-api";

/** Doctor chat is part of the paid service — locked until the booking is paid. */
function requiresPayment(item: AccountAppointment): boolean {
  if (!item.amountCents || item.amountCents <= 0) return false;
  return item.paymentStatus !== "PAID";
}

const CONSULT_LABELS: Record<string, string> = {
  general: "GP consultation",
  specialist: "Specialist consultation",
  prescription: "Online prescription",
  health_test: "Health test",
  home_delivery: "Home delivery",
};
function consultLabel(type: string): string {
  return CONSULT_LABELS[type.toLowerCase().replace(/[\s-]+/g, "_")] ?? type;
}

/** In-pane conversation for the patient: a Clinic / Doctor channel toggle over
 *  the two chat threads for one booking. */
function PatientConversation({
  item,
  defaultChannel,
}: {
  item: AccountAppointment;
  defaultChannel: "clinic" | "doctor";
}) {
  const locked = requiresPayment(item);
  const [channel, setChannel] = useState<"clinic" | "doctor">(
    defaultChannel === "doctor" && !locked ? "doctor" : "clinic",
  );

  const tabBtn = (active: boolean) =>
    `rounded-full px-3 py-1.5 text-[13px] font-semibold transition ${
      active
        ? "bg-[var(--portal-signal)] text-white"
        : "text-[var(--portal-muted)] hover:bg-[var(--portal-well)]"
    }`;

  return (
    <div className="flex h-full flex-col">
      <div className="mb-3 inline-flex gap-1 self-start rounded-full border border-[var(--portal-line)] p-1">
        <button type="button" className={tabBtn(channel === "clinic")} onClick={() => setChannel("clinic")}>
          <MessageCircle className="mr-1 inline size-3.5" aria-hidden />
          Clinic
        </button>
        <button
          type="button"
          className={tabBtn(channel === "doctor")}
          onClick={() => !locked && setChannel("doctor")}
          disabled={locked}
          title={locked ? "Complete payment to chat with your doctor" : undefined}
          style={locked ? { opacity: 0.5, cursor: "not-allowed" } : undefined}
        >
          <Stethoscope className="mr-1 inline size-3.5" aria-hidden />
          Doctor
        </button>
      </div>

      <div className="flex-1 overflow-hidden">
        {channel === "clinic" ? (
          <ChatThread
            appointmentId={item.id}
            viewerRole="PATIENT"
            fetcher={fetchPatientMessages}
            poster={postPatientMessage}
            variant="embedded"
          />
        ) : locked ? (
          <p className="rounded-md border border-[var(--portal-warning)] bg-[var(--portal-warning-soft)] px-4 py-3 text-sm text-[var(--portal-warning-text)]">
            Complete payment to unlock chat with your doctor.
          </p>
        ) : (
          <ConsultationChat
            appointmentId={item.id}
            viewerRole="PATIENT"
            fetcher={fetchPatientChat}
            poster={postPatientChatMessage}
            fileUploader={uploadPatientChatFile}
            variant="embedded"
          />
        )}
      </div>
    </div>
  );
}

export function MessagesShell({
  items,
  unreadById = {},
  initialOpenId = null,
  initialOpenChannel = "clinic",
  unavailableMessage,
}: {
  items: AccountAppointment[];
  unreadById?: Record<string, AccountThreadUnread>;
  initialOpenId?: string | null;
  initialOpenChannel?: "clinic" | "doctor";
  unavailableMessage?: string | null;
}) {
  if (unavailableMessage) {
    return (
      <div className="gh-status-warning rounded-[var(--radius-card-sm)] border px-4 py-3 text-sm">
        {unavailableMessage}
      </div>
    );
  }

  const threads: InboxThread[] = items.map((item) => {
    const u = unreadById[item.id];
    const unread = (u?.unreadClinic ?? 0) + (u?.unreadDoctor ?? 0);
    return {
      id: item.id,
      orderNumber: item.orderNumber ?? null,
      orderHref: "/account/bookings",
      name: item.fullName,
      subtitle: `${consultLabel(item.consultationType)} · ${item.countryCode.toUpperCase()}`,
      preview: null,
      timestamp: item.createdAt,
      unreadCount: unread,
    };
  });

  return (
    <MessagesInbox
      threads={threads}
      initialSelectedId={initialOpenId}
      renderChat={(thread) => {
        const item = items.find((i) => i.id === thread.id);
        if (!item) return null;
        return (
          <PatientConversation
            item={item}
            defaultChannel={thread.id === initialOpenId ? initialOpenChannel : "clinic"}
          />
        );
      }}
      emptyTitle="No conversations"
      emptyDescription="Once you have a booking you can message the clinic, and chat with your doctor after payment."
    />
  );
}
