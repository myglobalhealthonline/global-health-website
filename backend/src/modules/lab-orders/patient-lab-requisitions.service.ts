import { prisma } from "../../db/prisma.js";
import { normalizeDbError } from "../shared/db-errors.js";

/**
 * The patient's own view of their laboratory requisitions.
 *
 * A requisition is not an Appointment — it is prescribed by a doctor, priced on
 * a phone call, paid for, then handed to the lab — so it never appeared in the
 * portal at all, and a patient who had paid for exams could see no trace of
 * them. This lists them alongside their bookings.
 *
 * Read-only by design: every transition is driven by an admin or the lab, and
 * there is nothing here a patient could safely change. No cancel, no
 * reschedule, no prices they have not already been charged.
 *
 * Ownership is by `PatientProfile.userId`, not by `Order.userId`: a requisition
 * can exist with no order at all (still PRESCRIBED, never priced), and the
 * chart is the thing that actually belongs to the account.
 */

export type PatientLabRequisitionItem = {
  id: string;
  status: string;
  createdAt: string;
  /** When the patient is expected at the collection point, if scheduled. */
  collectionDate: string | null;
  /** Where to give the sample — "Provider — Branch" plus its address. */
  collectionPointName: string | null;
  collectionPointAddress: string | null;
  /** The exams on the requisition the patient agreed to. */
  exams: string[];
  /** Whether any result file has been matched to it yet. */
  hasResults: boolean;
  countryCode: string;
};

export async function listLabRequisitionsForUser(
  userId: string,
): Promise<PatientLabRequisitionItem[]> {
  try {
    const rows = await prisma.labRequisition.findMany({
      where: {
        patientProfile: { userId },
        // PRESCRIBED means a doctor wrote it and nobody has spoken to the
        // patient yet — showing it would announce tests they have not agreed
        // to and cannot act on. It becomes visible once the confirmation call
        // has happened.
        status: { not: "PRESCRIBED" },
      },
      select: {
        id: true,
        status: true,
        countryCode: true,
        createdAt: true,
        collectionDate: true,
        testCenterId: true,
        items: { select: { label: true, patientAccepted: true }, orderBy: { createdAt: "asc" } },
        _count: { select: { results: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    // The requisition points at the PROVIDER, not a branch, so there is one
    // name+address lookup per distinct centre rather than a join.
    const centreIds = Array.from(
      new Set(rows.map((r) => r.testCenterId).filter((id): id is string => Boolean(id))),
    );
    const centres = centreIds.length
      ? await prisma.testCenter.findMany({
          where: { id: { in: centreIds } },
          select: { id: true, name: true, addressLine: true, city: true },
        })
      : [];
    const centreById = new Map(centres.map((c) => [c.id, c]));

    return rows.map((row) => {
      const centre = row.testCenterId ? centreById.get(row.testCenterId) : undefined;
      return {
        id: row.id,
        status: row.status as string,
        countryCode: row.countryCode,
        createdAt: row.createdAt.toISOString(),
        collectionDate: row.collectionDate?.toISOString() ?? null,
        collectionPointName: centre?.name ?? null,
        collectionPointAddress:
          [centre?.addressLine, centre?.city]
            .map((part) => part?.trim())
            .filter(Boolean)
            .join(", ") || null,
        // `patientAccepted === false` is an exam they turned down on the call;
        // null is one never discussed. Neither belongs in their list.
        exams: row.items.filter((i) => i.patientAccepted === true).map((i) => i.label),
        hasResults: row._count.results > 0,
      };
    });
  } catch (error) {
    throw normalizeDbError(error, "Lab tests are temporarily unavailable");
  }
}
