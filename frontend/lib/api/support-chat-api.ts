/**
 * Browser-side fetchers for the doctor ↔ support (admin team) chat.
 *
 * Every call goes to a same-origin `/api/**` route handler, never to the
 * backend origin: the auth cookie is host-only, so a cross-origin fetch from
 * the browser would arrive unauthenticated.
 */

export type SupportMessage = {
  id: string;
  authorRole: "DOCTOR" | "ADMIN";
  /** Null when the author account was deleted. Drives the admin "Me" label. */
  authorUserId: string | null;
  authorFirstName: string;
  authorFullName: string | null;
  body: string | null;
  fileName: string | null;
  mimeType: string | null;
  byteSize: number | null;
  downloadUrl: string | null;
  readByDoctor: boolean;
  createdAt: string;
};

export type SupportThreadPayload = {
  threadId: string;
  items: SupportMessage[];
};

export type AdminSupportThreadPayload = SupportThreadPayload & {
  doctorId: string;
  doctorName: string;
  /** The viewing admin's user id, so their own bubbles can read "Me". */
  viewerUserId: string | null;
};

export type AdminSupportThreadSummary = {
  threadId: string;
  doctorId: string;
  doctorName: string;
  doctorSlug: string | null;
  lastMessageAt: string | null;
  lastMessage: SupportMessage | null;
  unreadCount: number;
};

async function readJson<T>(res: Response, fallbackMessage: string): Promise<T> {
  const json = await res.json().catch(() => null);
  if (!res.ok || !json?.ok) {
    throw new Error(json?.message ?? fallbackMessage);
  }
  return json.data as T;
}

// ── Doctor ────────────────────────────────────────────────────────────────

export async function fetchDoctorSupportThread(): Promise<SupportThreadPayload> {
  const res = await fetch("/api/doctor/support/thread", { cache: "no-store" });
  return readJson<SupportThreadPayload>(res, "Failed to load support messages");
}

export async function postDoctorSupportMessage(
  body: string,
): Promise<SupportThreadPayload> {
  const res = await fetch("/api/doctor/support/messages", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ body }),
  });
  return readJson<SupportThreadPayload>(res, "Failed to send message");
}

export async function uploadDoctorSupportFile(
  file: File,
): Promise<SupportThreadPayload> {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch("/api/doctor/support/messages/upload", {
    method: "POST",
    body: formData,
  });
  return readJson<SupportThreadPayload>(res, "Upload failed");
}

// ── Admin ─────────────────────────────────────────────────────────────────

export async function fetchAdminSupportThreadList(): Promise<{
  items: AdminSupportThreadSummary[];
  viewerUserId: string | null;
}> {
  const res = await fetch("/api/admin/support/threads", { cache: "no-store" });
  return readJson(res, "Failed to load support threads");
}

export async function fetchAdminSupportThread(
  threadId: string,
): Promise<AdminSupportThreadPayload> {
  const res = await fetch(`/api/admin/support/threads/${encodeURIComponent(threadId)}`, {
    cache: "no-store",
  });
  return readJson<AdminSupportThreadPayload>(res, "Failed to load support thread");
}

export async function postAdminSupportMessage(
  threadId: string,
  body: string,
): Promise<SupportThreadPayload> {
  const res = await fetch(
    `/api/admin/support/threads/${encodeURIComponent(threadId)}/messages`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ body }),
    },
  );
  return readJson<SupportThreadPayload>(res, "Failed to post reply");
}

export async function uploadAdminSupportFile(
  threadId: string,
  file: File,
): Promise<SupportThreadPayload> {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch(
    `/api/admin/support/threads/${encodeURIComponent(threadId)}/messages/upload`,
    { method: "POST", body: formData },
  );
  return readJson<SupportThreadPayload>(res, "Upload failed");
}

/** Clear this admin's SUPPORT_MESSAGE bells for one thread. Best-effort: a
 *  failure leaves a stale badge, which must not break opening the thread. */
export async function markAdminSupportNotificationsRead(
  threadId: string,
): Promise<void> {
  await fetch(
    `/api/admin/support/threads/${encodeURIComponent(threadId)}/notifications/read`,
    { method: "POST" },
  ).catch(() => {});
}
