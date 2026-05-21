function apiBase(): string {
  return (process.env.NEXT_PUBLIC_API_URL ?? "").replace(/\/+$/, "");
}

type ApiResult<T> =
  | { ok: true; data: T; message?: string }
  | { ok: false; message: string };

async function publicFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<ApiResult<T>> {
  const base = apiBase();
  if (!base) return { ok: false, message: "API not configured" };
  try {
    const res = await fetch(`${base}${path}`, {
      ...init,
      headers: {
        ...(init?.headers ?? {}),
        ...(init?.body && !(init.body instanceof FormData)
          ? { "content-type": "application/json" }
          : {}),
      },
    });
    const json = (await res.json()) as { ok?: boolean; data?: T; message?: string };
    if (!res.ok || !json.ok || json.data === undefined) {
      return { ok: false, message: json.message ?? "Request failed" };
    }
    return { ok: true, data: json.data as T, message: json.message };
  } catch {
    return { ok: false, message: "Service unavailable" };
  }
}

export function fetchBrazilConsentForm(appointmentId: string) {
  return publicFetch<{
    appointment: {
      id: string;
      fullName: string;
      email: string;
      phone: string | null;
      pharmacy: string | null;
      symptoms: string | null;
    };
    submission: { id: string; paymentStatus: string; paidAt: string | null } | null;
  }>(`/api/public/brazil-consent?appointmentId=${encodeURIComponent(appointmentId)}`);
}

export function submitBrazilConsent(body: Record<string, unknown>) {
  return publicFetch<{ submissionId: string; checkoutUrl: string | null; paymentStatus: string }>(
    "/api/public/brazil-consent/submit",
    { method: "POST", body: JSON.stringify(body) },
  );
}

export function fetchReviewForm(token: string) {
  return publicFetch<{
    submitted: boolean;
    invite?: {
      customerName: string | null;
      doctorName: string | null;
      serviceName: string | null;
    };
    locale: {
      title: string;
      intro: string;
      submit: string;
      thanks: string;
      labels: Record<string, string>;
    };
  }>(`/api/public/reviews/rate?token=${encodeURIComponent(token)}`);
}

export function submitReviewForm(
  token: string,
  ratings: Record<string, number>,
) {
  return publicFetch<{ submitted: boolean }>(
    `/api/public/reviews/rate?token=${encodeURIComponent(token)}`,
    { method: "POST", body: JSON.stringify(ratings) },
  );
}

export function fetchPatientUploadInfo(token: string) {
  return publicFetch<{ email: string; fullName: string | null }>(
    `/api/public/patient-upload?token=${encodeURIComponent(token)}`,
  );
}

export async function uploadPatientFile(token: string, file: File) {
  const base = apiBase();
  if (!base) return { ok: false as const, message: "API not configured" };
  const fd = new FormData();
  fd.set("token", token);
  fd.set("file", file);
  try {
    const res = await fetch(`${base}/api/public/patient-upload`, {
      method: "POST",
      body: fd,
    });
    const json = (await res.json()) as { ok?: boolean; message?: string };
    if (!res.ok || !json.ok) {
      return { ok: false as const, message: json.message ?? "Upload failed" };
    }
    return { ok: true as const, message: json.message };
  } catch {
    return { ok: false as const, message: "Upload failed" };
  }
}
