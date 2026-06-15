export type AppointmentUpdateDiff = {
  timeChanged: boolean;
  doctorChanged: boolean;
  hasChanges: boolean;
  nextScheduledAt: Date | null;
  nextDoctorId: string | null;
};

/** Pure helper — used by the update service and unit tests. */
export function computeAppointmentUpdateDiff(
  before: {
    scheduledAt: Date | null;
    doctorId: string | null;
  },
  input: {
    scheduledAt?: Date | null;
    doctorId?: string | null;
  },
): AppointmentUpdateDiff {
  const nextScheduledAt =
    input.scheduledAt !== undefined ? input.scheduledAt : before.scheduledAt;
  const nextDoctorId =
    input.doctorId !== undefined ? input.doctorId : before.doctorId;

  const beforeScheduledIso = before.scheduledAt?.toISOString() ?? null;
  const nextScheduledIso = nextScheduledAt?.toISOString() ?? null;
  const timeChanged = beforeScheduledIso !== nextScheduledIso;
  const doctorChanged = before.doctorId !== nextDoctorId;

  return {
    timeChanged,
    doctorChanged,
    hasChanges: timeChanged || doctorChanged,
    nextScheduledAt,
    nextDoctorId,
  };
}
