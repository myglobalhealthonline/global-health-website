"use client";

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

export type IssuePrescriptionInput = {
  drugName: string;
  dose?: string;
  frequency?: string;
  durationDays?: number | null;
  instructions?: string;
  refills?: number;
};

type Result<T> =
  | { ok: true; data: T; message?: string }
  | { ok: false; message: string };

export async function issuePrescription(
  appointmentId: string,
  input: IssuePrescriptionInput,
): Promise<Result<{ item: DoctorPrescription }>> {
  const res = await fetch(
    `/api/doctor/appointments/${appointmentId}/prescriptions`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(input),
    },
  );
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json?.ok) {
    return { ok: false, message: json?.message ?? "Failed to issue prescription" };
  }
  return { ok: true, data: json.data };
}

export async function deletePrescription(
  prescriptionId: string,
): Promise<Result<null>> {
  const res = await fetch(`/api/doctor/prescriptions/${prescriptionId}`, {
    method: "DELETE",
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json?.ok) {
    return { ok: false, message: json?.message ?? "Failed to delete" };
  }
  return { ok: true, data: null };
}
