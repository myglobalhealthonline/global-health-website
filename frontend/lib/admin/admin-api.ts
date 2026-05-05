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
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
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

export type AdminCurrencyDto = {
  id: string;
  code: string;
  symbol: string;
  decimals: number;
};

export type AdminCountryLocaleDto = {
  id: string;
  locale: string;
  isDefault: boolean;
};

export type AdminCountryDomainDto = {
  id: string;
  domain: string;
  isPrimary: boolean;
};

export type AdminCountryDto = {
  id: string;
  code: string;
  name: string;
  slug: string;
  legacyHomePath: string;
  teamPath: string;
  generalConsultationPath: string;
  specialistConsultationPath: string;
  defaultLocale: string;
  currencyId: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  currency: AdminCurrencyDto;
  countryLocales: AdminCountryLocaleDto[];
  domains: AdminCountryDomainDto[];
};

type AdminCountriesListPayload = {
  countries: AdminCountryDto[];
};

type AdminCountryDetailPayload = {
  country: AdminCountryDto;
};

type AdminCurrenciesListPayload = {
  currencies: AdminCurrencyDto[];
};

async function adminRequest<T>(
  path: string,
  init?: {
    method?: "GET" | "POST" | "PATCH" | "DELETE";
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

export async function fetchAdminAppointments(query?: Record<string, string | undefined>) {
  const params = new URLSearchParams();
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== "") {
        params.set(key, value);
      }
    }
  }
  const qs = params.toString();
  const path = qs ? `/api/admin/appointments?${qs}` : "/api/admin/appointments";
  return adminRequest<AdminAppointmentsListPayload>(path);
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

export async function fetchAdminCountries() {
  return adminRequest<AdminCountriesListPayload>("/api/admin/countries");
}

export async function fetchAdminCountryById(id: string) {
  return adminRequest<AdminCountryDetailPayload>(`/api/admin/countries/${id}`);
}

export async function fetchAdminCurrencies() {
  return adminRequest<AdminCurrenciesListPayload>("/api/admin/currencies");
}

export async function postAdminCountry(body: unknown) {
  return adminRequest<AdminCountryDetailPayload>("/api/admin/countries", {
    method: "POST",
    body,
  });
}

export async function patchAdminCountry(id: string, body: unknown) {
  return adminRequest<AdminCountryDetailPayload>(`/api/admin/countries/${id}`, {
    method: "PATCH",
    body,
  });
}

export async function deleteAdminCountry(id: string) {
  return adminRequest<AdminCountryDetailPayload>(`/api/admin/countries/${id}`, {
    method: "DELETE",
  });
}

export type AdminSpecialtyOptionDto = {
  id: string;
  slug: string;
  name: string;
  active: boolean;
};

export type AdminServiceDto = {
  id: string;
  countryId: string;
  specialtyId: string | null;
  slug: string;
  name: string;
  summary: string | null;
  legacyPath: string | null;
  durationMinutes: number | null;
  basePriceCents: number | null;
  currencyCode: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  country: { id: string; code: string; name: string };
  specialty: {
    id: string;
    countryId: string;
    slug: string;
    name: string;
    active: boolean;
    createdAt: string;
    updatedAt: string;
  } | null;
};

type AdminServicesListPayload = {
  items: AdminServiceDto[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};

type AdminServiceDetailPayload = {
  service: AdminServiceDto;
};

type AdminSpecialtiesPayload = {
  specialties: AdminSpecialtyOptionDto[];
};

export async function fetchAdminServices(query?: Record<string, string | undefined>) {
  const params = new URLSearchParams();
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== "") {
        params.set(key, value);
      }
    }
  }
  const qs = params.toString();
  const path = qs ? `/api/admin/services?${qs}` : "/api/admin/services";
  return adminRequest<AdminServicesListPayload>(path);
}

export async function fetchAdminServiceById(id: string) {
  return adminRequest<AdminServiceDetailPayload>(`/api/admin/services/${id}`);
}

export async function fetchAdminSpecialties(countryId: string) {
  const params = new URLSearchParams({ countryId });
  return adminRequest<AdminSpecialtiesPayload>(`/api/admin/specialties?${params.toString()}`);
}

export async function postAdminService(body: unknown) {
  return adminRequest<AdminServiceDetailPayload>("/api/admin/services", {
    method: "POST",
    body,
  });
}

export async function patchAdminService(id: string, body: unknown) {
  return adminRequest<AdminServiceDetailPayload>(`/api/admin/services/${id}`, {
    method: "PATCH",
    body,
  });
}

export async function deleteAdminService(id: string) {
  return adminRequest<AdminServiceDetailPayload>(`/api/admin/services/${id}`, {
    method: "DELETE",
  });
}

export type AdminDoctorSpecialtyLinkDto = {
  id: string;
  doctorId: string;
  specialtyId: string;
  specialty: AdminSpecialtyOptionDto;
};

export type AdminDoctorAssetDto = {
  id: string;
  kind: string;
  key: string;
  path: string;
};

export type AdminDoctorDto = {
  id: string;
  countryId: string;
  slug: string;
  fullName: string;
  title: string;
  bio: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  country: { id: string; code: string; name: string; teamPath: string };
  specialties: AdminDoctorSpecialtyLinkDto[];
  assets: AdminDoctorAssetDto[];
};

type AdminDoctorsListPayload = {
  items: AdminDoctorDto[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};

type AdminDoctorDetailPayload = {
  doctor: AdminDoctorDto;
};

export function doctorPublicProfilePath(teamPath: string, slug: string): string {
  const base = teamPath.replace(/\/$/, "");
  return `${base}/${slug}`;
}

export async function fetchAdminDoctors(query?: Record<string, string | undefined>) {
  const params = new URLSearchParams();
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== "") {
        params.set(key, value);
      }
    }
  }
  const qs = params.toString();
  const path = qs ? `/api/admin/doctors?${qs}` : "/api/admin/doctors";
  return adminRequest<AdminDoctorsListPayload>(path);
}

export async function fetchAdminDoctorById(id: string) {
  return adminRequest<AdminDoctorDetailPayload>(`/api/admin/doctors/${id}`);
}

export async function postAdminDoctor(body: unknown) {
  return adminRequest<AdminDoctorDetailPayload>("/api/admin/doctors", {
    method: "POST",
    body,
  });
}

export async function patchAdminDoctor(id: string, body: unknown) {
  return adminRequest<AdminDoctorDetailPayload>(`/api/admin/doctors/${id}`, {
    method: "PATCH",
    body,
  });
}

export async function deleteAdminDoctor(id: string) {
  return adminRequest<AdminDoctorDetailPayload>(`/api/admin/doctors/${id}`, {
    method: "DELETE",
  });
}
