import { PatientAlertAction, PatientAlertType } from "@prisma/client";
import { prisma } from "../../db/prisma.js";
import { normalizeDbError } from "../shared/db-errors.js";

/**
 * Chart history for the doctor-only alert banners
 * (`PatientProfile.statusAlert` / `clinicAlert`).
 *
 * Two rules the rest of the app leans on:
 *   1. Setting or editing an alert goes through the normal profile PATCH and
 *      is logged here as SET / UPDATED, best-effort.
 *   2. *Clearing* an alert never goes through PATCH — `applyPatientProfileUpdate`
 *      throws `AlertRemovalRequiresNoteError` for that — it goes through
 *      `removePatientAlert` below, which demands a note and writes it into the
 *      chart. That is the whole point of this module: an alert a colleague
 *      raised can't quietly vanish.
 */

export class AlertRemovalRequiresNoteError extends Error {
  constructor(
    message = "Removing an alert requires a note — use the remove-alert endpoint",
  ) {
    super(message);
    this.name = "AlertRemovalRequiresNoteError";
  }
}

export class AlertNotFoundError extends Error {
  constructor(message = "No alert to remove") {
    super(message);
    this.name = "AlertNotFoundError";
  }
}

export type AlertActor = {
  userId: string | null;
  role: string;
  name?: string | null;
};

const FIELD_BY_TYPE = {
  STATUS: "statusAlert",
  CLINIC: "clinicAlert",
} as const satisfies Record<PatientAlertType, "statusAlert" | "clinicAlert">;

/** Empty string and null both mean "no alert" — normalize before comparing. */
export function normalizeAlert(value: string | null | undefined): string | null {
  const trimmed = (value ?? "").trim();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * Record SET/UPDATED rows for whichever alert actually changed. Never throws:
 * a failed history write must not roll back a profile edit that already
 * committed, so callers `void` this and errors are swallowed (mirrors
 * logContactChange in patient-profile.service.ts).
 */
export async function recordAlertChanges(params: {
  patientProfileId: string;
  actor: AlertActor;
  before: { statusAlert: string | null; clinicAlert: string | null };
  after: { statusAlert: string | null; clinicAlert: string | null };
}): Promise<void> {
  const rows: Array<{
    patientProfileId: string;
    alertType: PatientAlertType;
    action: PatientAlertAction;
    previousValue: string | null;
    newValue: string | null;
    actorUserId: string | null;
    actorRole: string;
    actorName: string | null;
  }> = [];

  for (const alertType of ["STATUS", "CLINIC"] as const) {
    const field = FIELD_BY_TYPE[alertType];
    const previousValue = normalizeAlert(params.before[field]);
    const newValue = normalizeAlert(params.after[field]);
    if (previousValue === newValue) continue;
    // REMOVED is never produced here — clearing is routed through
    // removePatientAlert, which writes its own row with the note.
    if (newValue === null) continue;
    rows.push({
      patientProfileId: params.patientProfileId,
      alertType,
      action: previousValue === null ? "SET" : "UPDATED",
      previousValue,
      newValue,
      actorUserId: params.actor.userId,
      actorRole: params.actor.role,
      actorName: params.actor.name ?? null,
    });
  }

  if (rows.length === 0) return;
  try {
    await prisma.patientAlertLog.createMany({ data: rows });
  } catch {
    // Best-effort history; the profile write already succeeded.
  }
}

/**
 * Clear one alert, with a mandatory reason that becomes part of the chart.
 * Returns the updated profile row plus the log entry that was written.
 */
export async function removePatientAlert(params: {
  email: string;
  alertType: PatientAlertType;
  note: string;
  actor: AlertActor;
}) {
  const note = params.note.trim();
  if (note.length < 3) {
    throw new AlertRemovalRequiresNoteError("A removal note is required");
  }
  const field = FIELD_BY_TYPE[params.alertType];
  try {
    const profile = await prisma.patientProfile.findUnique({
      where: { email: params.email },
      select: { id: true, statusAlert: true, clinicAlert: true },
    });
    const previousValue = normalizeAlert(profile?.[field]);
    if (!profile || previousValue === null) {
      // Already cleared — surfacing this as 404 rather than a silent no-op
      // keeps a stale tab from writing a removal note against nothing.
      throw new AlertNotFoundError();
    }
    const [updated, log] = await prisma.$transaction([
      prisma.patientProfile.update({
        where: { id: profile.id },
        data: { [field]: null },
      }),
      prisma.patientAlertLog.create({
        data: {
          patientProfileId: profile.id,
          alertType: params.alertType,
          action: "REMOVED",
          previousValue,
          newValue: null,
          note,
          actorUserId: params.actor.userId,
          actorRole: params.actor.role,
          actorName: params.actor.name ?? null,
        },
      }),
    ]);
    return { profile: updated, log, previousValue };
  } catch (error) {
    if (
      error instanceof AlertNotFoundError ||
      error instanceof AlertRemovalRequiresNoteError
    ) {
      throw error;
    }
    throw normalizeDbError(error, "Alert removal temporarily unavailable");
  }
}

export type SerializedAlertLog = {
  id: string;
  alertType: PatientAlertType;
  action: PatientAlertAction;
  previousValue: string | null;
  newValue: string | null;
  note: string | null;
  actorRole: string;
  actorName: string | null;
  createdAt: string;
};

/**
 * Chart-tab history, newest first. `actorUserId` is deliberately not returned
 * — the chart shows who by name/role, not an internal id.
 */
export async function listPatientAlertLog(
  patientProfileId: string,
  limit = 50,
): Promise<SerializedAlertLog[]> {
  const rows = await prisma.patientAlertLog.findMany({
    where: { patientProfileId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
  return rows.map((row) => ({
    id: row.id,
    alertType: row.alertType,
    action: row.action,
    previousValue: row.previousValue,
    newValue: row.newValue,
    note: row.note,
    actorRole: row.actorRole,
    actorName: row.actorName,
    createdAt: row.createdAt.toISOString(),
  }));
}
