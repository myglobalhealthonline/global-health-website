import "server-only";

import { cookies } from "next/headers";
import { getBackendOrigin } from "@/lib/server/backend-origin";

export type DoctorPrescription = {
  id: string;
  drugName: string;
  dose: string | null;
  frequency: string | null;
  durationDays: number | null;
  instructions: string | null;
  refills: number;
  consultationLocked: boolean;
  createdAt: string;
};

export type PatientIssuedPrescription = {
  id: string;
  drugName: string;
  dose: string | null;
  frequency: string | null;
  durationDays: number | null;
  instructions: string | null;
  refills: number;
  appointmentId: string;
  doctorName: string;
  consultationSignedAt: string | null;
  createdAt: string;
};

export type PatientPrescriptionOrder = {
  appointmentId: string;
  consultationType: string;
  countryCode: string;
  status: string;
  paymentStatus: string;
  amountCents: number | null;
  currencyCode: string | null;
  scheduledAt: string | null;
  serviceName: string | null;
  createdAt: string;
};

type ApiResult<T> =
  | { ok: true; data: T; message?: string }
  | { ok: false; message: string; status?: number };

async function cookieHeader() {
  try {
    const store = await cookies();
    return store
      .getAll()
      .map((c) => `${c.name}=${c.value}`)
      .join("; ");
  } catch {
    return "";
  }
}

export async function fetchDoctorPrescriptions(
  appointmentId: string,
): Promise<
  ApiResult<{ items: DoctorPrescription[]; consultationLocked?: boolean }>
> {
  const backend = getBackendOrigin();
  if (!backend) return { ok: false, message: "Backend not configured" };
  const cookie = await cookieHeader();
  try {
    const res = await fetch(
      `${backend}/api/doctor/appointments/${appointmentId}/prescriptions`,
      { headers: cookie ? { cookie } : undefined, cache: "no-store" },
    );
    const json = (await res.json()) as {
      ok?: boolean;
      data?: { items: DoctorPrescription[]; consultationLocked?: boolean };
      message?: string;
    };
    if (!res.ok || !json.ok || !json.data) {
      return { ok: false, status: res.status, message: json.message ?? "Failed" };
    }
    return { ok: true, data: json.data };
  } catch {
    return { ok: false, message: "Backend unavailable" };
  }
}

export async function fetchPatientPrescriptions(): Promise<
  ApiResult<{ issued: PatientIssuedPrescription[]; orders: PatientPrescriptionOrder[] }>
> {
  const backend = getBackendOrigin();
  if (!backend) return { ok: false, message: "Backend not configured" };
  const cookie = await cookieHeader();
  try {
    const res = await fetch(`${backend}/api/account/prescriptions`, {
      headers: cookie ? { cookie } : undefined,
      cache: "no-store",
    });
    const json = (await res.json()) as {
      ok?: boolean;
      data?: { issued: PatientIssuedPrescription[]; orders: PatientPrescriptionOrder[] };
      message?: string;
    };
    if (!res.ok || !json.ok || !json.data) {
      return { ok: false, status: res.status, message: json.message ?? "Failed" };
    }
    return { ok: true, data: json.data };
  } catch {
    return { ok: false, message: "Backend unavailable" };
  }
}
