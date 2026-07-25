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

const CONSULT_LABEL_KEYS: Record<string, keyof MessagesI18n> = {
  general: "typeGeneral",
  specialist: "typeSpecialist",
  prescription: "typePrescription",
  health_test: "typeHealthTest",
  home_delivery: "typeHomeDelivery",
};
function consultLabel(type: string, i18n: MessagesI18n): string {
  const key = CONSULT_LABEL_KEYS[type.toLowerCase().replace(/[\s-]+/g, "_")];
  return key ? (i18n[key] ?? type) : type;
}

type MessagesI18n = {
  clinicTab: string;
  doctorTab: string;
  lockedTooltip: string;
  lockedBody: string;
  emptyTitle: string;
  emptyBody: string;
  typeGeneral: string;
  typeSpecialist: string;
  typePrescription: string;
  typeHealthTest: string;
  typeHomeDelivery: string;
  chatEmptyTitle?: string;
  chatEmptyBody?: string;
  chatPlaceholder?: string;
  chatSend?: string;
  searchPlaceholder?: string;
  noMatchesLabel?: string;
  backAriaLabel?: string;
  orderLinkTitle?: string;
  selectConversationTitle?: string;
  selectConversationBody?: string;
};

const DEFAULT_I18N: MessagesI18n = {
  clinicTab: "Clinic",
  doctorTab: "Doctor",
  lockedTooltip: "Complete payment to chat with your doctor",
  lockedBody: "Complete payment to unlock chat with your doctor.",
  emptyTitle: "No conversations",
  emptyBody: "Once you have a booking you can message the clinic, and chat with your doctor after payment.",
  typeGeneral: "GP consultation",
  typeSpecialist: "Specialist consultation",
  typePrescription: "Online prescription",
  typeHealthTest: "Health test",
  typeHomeDelivery: "Home delivery",
};

/** In-pane conversation for the patient: a Clinic / Doctor channel toggle over
 *  the two chat threads for one booking. */
function PatientConversation({
  item,
  defaultChannel,
  i18n,
  consultationChatI18n,
}: {
  item: AccountAppointment;
  defaultChannel: "clinic" | "doctor";
  i18n: MessagesI18n;
  consultationChatI18n?: Record<string, string>;
}) {
  const locked = requiresPayment(item);
  const [channel, setChannel] = useState<"clinic" | "doctor">(
    defaultChannel === "doctor" && !locked ? "doctor" : "clinic",
  );

  const tabBtn = (active: boolean) =>
    `rounded-full px-3 py-1.5 text-portal-compact font-semibold transition ${
      active
        ? "bg-[var(--portal-signal)] text-[#0b150f]"
        : "text-[var(--portal-muted)] hover:bg-[var(--portal-well)]"
    }`;

  return (
    <div className="flex h-full flex-col">
      <div className="mb-3 inline-flex gap-1 self-start rounded-full border border-[var(--portal-line)] p-1">
        <button type="button" className={tabBtn(channel === "clinic")} onClick={() => setChannel("clinic")}>
          <MessageCircle className="mr-1 inline size-3.5" aria-hidden />
          {i18n.clinicTab}
        </button>
        <button
          type="button"
          className={tabBtn(channel === "doctor")}
          onClick={() => !locked && setChannel("doctor")}
          disabled={locked}
          title={locked ? i18n.lockedTooltip : undefined}
          style={locked ? { opacity: 0.5, cursor: "not-allowed" } : undefined}
        >
          <Stethoscope className="mr-1 inline size-3.5" aria-hidden />
          {i18n.doctorTab}
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
            emptyTitle={i18n.chatEmptyTitle}
            emptyBody={i18n.chatEmptyBody}
            composerPlaceholder={i18n.chatPlaceholder}
            sendLabel={i18n.chatSend}
          />
        ) : locked ? (
          <p className="rounded-md border border-[var(--portal-warning)] bg-[var(--portal-warning-soft)] px-4 py-3 text-sm text-[var(--portal-warning-text)]">
            {i18n.lockedBody}
          </p>
        ) : (
          <ConsultationChat
            appointmentId={item.id}
            viewerRole="PATIENT"
            fetcher={fetchPatientChat}
            poster={postPatientChatMessage}
            fileUploader={uploadPatientChatFile}
            variant="embedded"
            labels={consultationChatI18n}
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
  i18n = DEFAULT_I18N,
  consultationChatI18n,
}: {
  items: AccountAppointment[];
  unreadById?: Record<string, AccountThreadUnread>;
  initialOpenId?: string | null;
  initialOpenChannel?: "clinic" | "doctor";
  unavailableMessage?: string | null;
  i18n?: MessagesI18n;
  consultationChatI18n?: Record<string, string>;
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
      subtitle: `${consultLabel(item.consultationType, i18n)} · ${item.countryCode.toUpperCase()}`,
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
            i18n={i18n}
            consultationChatI18n={consultationChatI18n}
          />
        );
      }}
      emptyTitle={i18n.emptyTitle}
      emptyDescription={i18n.emptyBody}
      searchPlaceholder={i18n.searchPlaceholder}
      noMatchesLabel={i18n.noMatchesLabel}
      backAriaLabel={i18n.backAriaLabel}
      orderLinkTitle={i18n.orderLinkTitle}
      selectConversationTitle={i18n.selectConversationTitle}
      selectConversationBody={i18n.selectConversationBody}
    />
  );
}
