"use client";

import { useCallback } from "react";
import { MessagesInbox, type InboxThread } from "@/components/messages/MessagesInbox";
import { SupportChat } from "@/components/chat/SupportChat";
import {
  fetchAdminSupportThread,
  postAdminSupportMessage,
  uploadAdminSupportFile,
  markAdminSupportNotificationsRead,
  type AdminSupportThreadSummary,
} from "@/lib/api/support-chat-api";

/**
 * Admin side of the doctor support chat: thread list left, conversation right.
 *
 * English copy by design — the admin portal is English throughout; the doctor
 * side is the localized surface.
 */
export function AdminSupportInbox({
  threads,
  viewerUserId,
  initialSelectedId,
}: {
  threads: AdminSupportThreadSummary[];
  viewerUserId: string | null;
  initialSelectedId?: string | null;
}) {
  const items: InboxThread[] = threads.map((t) => ({
    id: t.threadId,
    // Support threads aren't appointment-scoped, so there is no order number to
    // show. The doctor's public profile is the useful record to link out to.
    orderNumber: null,
    orderHref: t.doctorSlug ? `/admin/doctors/${t.doctorSlug}` : `/admin/doctors`,
    name: t.doctorName,
    subtitle: "Support thread",
    preview: t.lastMessage
      ? `${t.lastMessage.authorRole === "DOCTOR" ? "Doctor" : t.lastMessage.authorFirstName}: ${
          t.lastMessage.body ?? t.lastMessage.fileName ?? "Attachment"
        }`
      : null,
    timestamp: t.lastMessageAt,
    unreadCount: t.unreadCount,
  }));

  return (
    <MessagesInbox
      threads={items}
      initialSelectedId={initialSelectedId ?? null}
      renderChat={(thread) => (
        // Keyed so switching threads remounts the chat instead of briefly
        // showing the previous doctor's messages.
        <AdminSupportThreadChat
          key={thread.id}
          threadId={thread.id}
          viewerUserId={viewerUserId}
        />
      )}
      emptyTitle="No support messages yet"
      emptyDescription="When a doctor writes in from their portal, the conversation shows up here and the admin team is emailed and messaged on WhatsApp. Use “New conversation” above to write to a doctor first."
      selectConversationTitle="Select a doctor"
      selectConversationBody="Choose a doctor on the left to read and reply to their support thread."
      orderFallbackLabel="Open doctor"
    />
  );
}

function AdminSupportThreadChat({
  threadId,
  viewerUserId,
}: {
  threadId: string;
  viewerUserId: string | null;
}) {
  const fetcher = useCallback(async () => {
    const data = await fetchAdminSupportThread(threadId);
    // Opening the thread bumps the read cursor server-side; clearing the bell
    // rows is a separate call, best-effort so a failure can't block the read.
    void markAdminSupportNotificationsRead(threadId);
    return data;
  }, [threadId]);

  const poster = useCallback(
    (body: string) => postAdminSupportMessage(threadId, body),
    [threadId],
  );

  const fileUploader = useCallback(
    (file: File) => uploadAdminSupportFile(threadId, file),
    [threadId],
  );

  return (
    <SupportChat
      viewerSide="ADMIN"
      viewerUserId={viewerUserId}
      fetcher={fetcher}
      poster={poster}
      fileUploader={fileUploader}
      labels={{
        emptyBody:
          "Write below — the doctor sees your first name, and is alerted by email and WhatsApp.",
        placeholder: "Reply to the doctor…",
      }}
    />
  );
}
