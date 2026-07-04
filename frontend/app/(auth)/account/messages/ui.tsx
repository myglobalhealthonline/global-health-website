"use client";

import { useMemo, useState } from "react";
import { MessageCircle, Stethoscope, Search } from "lucide-react";
import type { AccountAppointment } from "@/lib/api/account-appointments-api";
import { PortalDialog } from "@/components/PortalDialog";
import { PortalMobileCard } from "@/components/PortalMobileCard";
import { AdminEmptyState, Pill } from "@/components/portal-atoms";
import type { PillTone } from "@/components/portal-atoms";
import { ChatThread } from "@/components/chat/ChatThread";
import { fetchPatientMessages, postPatientMessage } from "@/lib/api/chat-api";
import { ConsultationChat } from "@/components/chat/ConsultationChat";
import {
  fetchPatientChat,
  postPatientMessage as postPatientChatMessage,
  uploadPatientChatFile,
} from "@/lib/api/consultation-chat-api";
import { formatAppDateTime } from "@/lib/format-datetime";

/** Doctor chat is part of the paid service. Same rule as the bookings screen:
 *  a priced-but-unpaid appointment can't open the doctor thread yet. */
function requiresPayment(item: AccountAppointment): boolean {
  if (!item.amountCents || item.amountCents <= 0) return false;
  return item.paymentStatus !== "PAID";
}

function statusTone(status: string): PillTone {
  if (status === "COMPLETED") return "active";
  if (status === "CANCELLED") return "inactive";
  return "neutral";
}

function formatStatus(status: string) {
  return status
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function MessagesShell({
  items,
  unavailableMessage,
}: {
  items: AccountAppointment[];
  unavailableMessage?: string | null;
}) {
  const [openChatId, setOpenChatId] = useState<string | null>(null);
  const [openConsultChatId, setOpenConsultChatId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (i) =>
        i.consultationType.toLowerCase().includes(q) ||
        i.countryCode.toLowerCase().includes(q),
    );
  }, [items, search]);

  if (unavailableMessage) {
    return (
      <div className="gh-status-warning rounded-[var(--radius-card-sm)] border px-4 py-3 text-sm">
        {unavailableMessage}
      </div>
    );
  }

  return (
    <div>
      <label className="relative mb-4 block max-w-sm">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--portal-muted)]"
          aria-hidden
        />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search conversations"
          className="w-full rounded-full border border-[var(--portal-line)] bg-[var(--portal-surface)] py-2 pl-9 pr-3 text-sm text-[var(--portal-text)] focus:outline-none focus:ring-2 focus:ring-[var(--portal-signal)]/40"
        />
      </label>

      {filtered.length === 0 ? (
        <AdminEmptyState
          icon={<MessageCircle className="size-6" aria-hidden />}
          title="No conversations"
          description="Once you have a booking you can message the clinic, and chat with your doctor after payment."
        />
      ) : (
        <div className="grid gap-4">
          {filtered.map((item) => {
            const doctorLocked = requiresPayment(item);
            return (
              <PortalMobileCard
                key={item.id}
                tone="neutral"
                title={item.consultationType}
                subtitle={formatAppDateTime(item.createdAt)}
                statusPill={
                  <Pill tone={statusTone(item.status)}>{formatStatus(item.status)}</Pill>
                }
                meta={[{ label: "Country", value: item.countryCode.toUpperCase() }]}
              >
                <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                  <button
                    type="button"
                    onClick={() => {
                      setOpenConsultChatId(null);
                      setOpenChatId(item.id);
                    }}
                    className="inline-flex w-full items-center justify-center gap-1.5 rounded-md border border-[var(--portal-line)] px-3 py-2 text-sm font-semibold text-[var(--portal-primary)] hover:bg-[var(--portal-well)] sm:w-auto"
                  >
                    <MessageCircle className="size-4" aria-hidden />
                    Message the clinic
                  </button>

                  {doctorLocked ? (
                    <span
                      className="inline-flex w-full items-center justify-center gap-1.5 rounded-md border px-3 py-2 text-sm font-medium sm:w-auto"
                      style={{
                        borderColor: "var(--portal-warning)",
                        background: "var(--portal-warning-soft)",
                        color: "var(--portal-warning-text)",
                      }}
                      title="Complete payment to unlock chat with your doctor"
                    >
                      <Stethoscope className="size-4" aria-hidden />
                      Doctor chat — complete payment to unlock
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setOpenChatId(null);
                        setOpenConsultChatId(item.id);
                      }}
                      className="inline-flex w-full items-center justify-center gap-1.5 rounded-md border border-[var(--portal-line)] px-3 py-2 text-sm font-semibold text-[var(--portal-primary)] hover:bg-[var(--portal-well)] sm:w-auto"
                    >
                      <Stethoscope className="size-4" aria-hidden />
                      Chat with your doctor
                    </button>
                  )}
                </div>

                <PortalDialog
                  open={openChatId === item.id}
                  onClose={() => setOpenChatId(null)}
                  title="Message the clinic"
                  width="sm"
                  noBodyPadding
                >
                  <ChatThread
                    appointmentId={item.id}
                    viewerRole="PATIENT"
                    fetcher={fetchPatientMessages}
                    poster={postPatientMessage}
                    variant="embedded"
                  />
                </PortalDialog>

                <PortalDialog
                  open={openConsultChatId === item.id && !doctorLocked}
                  onClose={() => setOpenConsultChatId(null)}
                  title="Chat with your doctor"
                  width="sm"
                  noBodyPadding
                >
                  <ConsultationChat
                    appointmentId={item.id}
                    viewerRole="PATIENT"
                    fetcher={fetchPatientChat}
                    poster={postPatientChatMessage}
                    fileUploader={uploadPatientChatFile}
                    variant="embedded"
                  />
                </PortalDialog>
              </PortalMobileCard>
            );
          })}
        </div>
      )}
    </div>
  );
}
