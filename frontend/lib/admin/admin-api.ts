import "server-only";

const DEFAULT_ADMIN_API_BASE_URL = "http://localhost:4000";

function getAdminApiBaseUrl() {
  return (
    process.env.ADMIN_API_BASE_URL?.replace(/\/$/, "") ??
    process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ??
    DEFAULT_ADMIN_API_BASE_URL
  );
}

function getAdminApiToken() {
  return process.env.ADMIN_API_TOKEN ?? "";
}

type AdminApiResponse<T> =
  | { ok: true; data: T; message?: string }
  | { ok: false; message: string; status?: number };

type AdminAppointmentsListPayload = {
  items: Array<{
    id: string;
    country: string;
    consultationType: string;
    fullName: string;
    email: string;
    phone: string | null;
    notesPreview: string | null;
    status: string;
    createdAt: string;
  }>;
};

type AdminAppointmentDetailPayload = {
  appointment: {
    id: string;
    country: string;
    consultationType: string;
    fullName: string;
    email: string;
    phone: string | null;
    notes: string | null;
    status: string;
    createdAt: string;
    updatedAt: string;
  };
};

async function adminRequest<T>(
  path: string,
  init?: {
    method?: "GET" | "PATCH";
    body?: unknown;
  },
): Promise<AdminApiResponse<T>> {
  const token = getAdminApiToken();
  if (!token) {
    return {
      ok: false,
      message: "ADMIN_API_TOKEN is missing in frontend runtime env",
    };
  }

  try {
    const response = await fetch(`${getAdminApiBaseUrl()}${path}`, {
      method: init?.method ?? "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: init?.body ? JSON.stringify(init.body) : undefined,
      cache: "no-store",
    });

    const json = (await response.json()) as {
      ok?: boolean;
      message?: string;
      data?: T;
    };

    if (!response.ok || !json.ok) {
      return {
        ok: false,
        message: json.message ?? "Admin request failed",
        status: response.status,
      };
    }

    return {
      ok: true,
      data: json.data as T,
      message: json.message,
    };
  } catch {
    return { ok: false, message: "Admin backend is unavailable" };
  }
}

export async function fetchAdminAppointments() {
  return adminRequest<AdminAppointmentsListPayload>("/api/admin/appointments");
}

export async function fetchAdminAppointmentById(id: string) {
  return adminRequest<AdminAppointmentDetailPayload>(`/api/admin/appointments/${id}`);
}

export async function patchAdminAppointmentStatus(id: string, status: string) {
  return adminRequest<AdminAppointmentDetailPayload>(`/api/admin/appointments/${id}/status`, {
    method: "PATCH",
    body: { status },
  });
}
