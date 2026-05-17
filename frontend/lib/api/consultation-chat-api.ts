export type ChatMessage = {
  id: string;
  authorRole: "PATIENT" | "DOCTOR";
  body: string | null;
  fileName: string | null;
  mimeType: string | null;
  byteSize: number | null;
  downloadUrl: string | null;
  readByPatient: boolean;
  readByDoctor: boolean;
  createdAt: string;
};

type ChatResponse = {
  items: ChatMessage[];
  chatLocked: boolean;
  paymentRequired: boolean;
};

function readChatResponse(data: {
  items: ChatMessage[];
  chatLocked: boolean;
  paymentRequired?: boolean;
}): ChatResponse {
  return {
    items: data.items,
    chatLocked: data.chatLocked,
    paymentRequired: data.paymentRequired ?? false,
  };
}

// ── Patient ───────────────────────────────────────────────────────────────

export async function fetchPatientChat(
  appointmentId: string,
): Promise<ChatResponse> {
  const res = await fetch(`/api/account/appointments/${appointmentId}/chat`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error("Failed to load messages");
  const json = await res.json();
  return readChatResponse(json.data);
}

export async function postPatientMessage(
  appointmentId: string,
  body: string,
): Promise<ChatResponse> {
  const res = await fetch(`/api/account/appointments/${appointmentId}/chat`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ body }),
  });
  if (res.status === 403) {
    const json = await res.json().catch(() => ({}));
    throw new Error(json?.message ?? "Chat unavailable");
  }
  if (!res.ok) throw new Error("Failed to send message");
  const json = await res.json();
  return readChatResponse(json.data);
}

export async function uploadPatientChatFile(
  appointmentId: string,
  file: File,
): Promise<ChatResponse> {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch(
    `/api/account/appointments/${appointmentId}/chat/upload`,
    { method: "POST", body: formData },
  );
  if (res.status === 403) {
    const json = await res.json().catch(() => ({}));
    throw new Error(json?.message ?? "Upload unavailable");
  }
  if (!res.ok) throw new Error("Upload failed");
  const json = await res.json();
  return readChatResponse(json.data);
}

// ── Doctor ────────────────────────────────────────────────────────────────

export async function fetchDoctorChat(
  appointmentId: string,
): Promise<ChatResponse> {
  const res = await fetch(`/api/doctor/appointments/${appointmentId}/chat`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error("Failed to load messages");
  const json = await res.json();
  return readChatResponse(json.data);
}

export async function postDoctorMessage(
  appointmentId: string,
  body: string,
): Promise<ChatResponse> {
  const res = await fetch(`/api/doctor/appointments/${appointmentId}/chat`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ body }),
  });
  if (res.status === 403) {
    const json = await res.json().catch(() => ({}));
    throw new Error(json?.message ?? "Chat unavailable");
  }
  if (!res.ok) throw new Error("Failed to send message");
  const json = await res.json();
  return readChatResponse(json.data);
}

export async function uploadDoctorChatFile(
  appointmentId: string,
  file: File,
): Promise<ChatResponse> {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch(
    `/api/doctor/appointments/${appointmentId}/chat/upload`,
    { method: "POST", body: formData },
  );
  if (res.status === 403) {
    const json = await res.json().catch(() => ({}));
    throw new Error(json?.message ?? "Upload unavailable");
  }
  if (!res.ok) throw new Error("Upload failed");
  const json = await res.json();
  return readChatResponse(json.data);
}

export async function toggleDoctorChatLock(
  appointmentId: string,
  open: boolean,
): Promise<{ chatLocked: boolean }> {
  const res = await fetch(`/api/doctor/appointments/${appointmentId}/chat`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ open }),
  });
  if (!res.ok) throw new Error("Failed to update chat status");
  const json = await res.json();
  return { chatLocked: json.data.chatLocked };
}
