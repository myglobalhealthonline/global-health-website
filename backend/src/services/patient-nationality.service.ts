import { prisma } from "../db/prisma.js";
import { normalizeDbError } from "../modules/shared/db-errors.js";
import { encryptPhi, decryptPhi } from "../lib/crypto/phi-crypto.js";

export class NationalitySlotConflictError extends Error {
  constructor() {
    super("You can register a maximum of two nationality documents.");
    this.name = "NationalitySlotConflictError";
  }
}

export class NationalityNotFoundError extends Error {
  constructor() {
    super("Nationality document not found");
    this.name = "NationalityNotFoundError";
  }
}

const VALID_SLOT = new Set([1, 2]);

function assertValidSlot(slot: number) {
  if (!VALID_SLOT.has(slot)) {
    throw new Error("slotNumber must be 1 or 2");
  }
}

export type NationalityInput = {
  slotNumber: 1 | 2;
  nationalityCountry: string;
  documentType: string;
  documentNumber?: string | null;
  expiryDate?: Date | null;
};

export async function listNationalityDocuments(patientProfileId: string) {
  try {
    const docs = await prisma.patientNationalityDocument.findMany({
      where: { patientProfileId },
      orderBy: { slotNumber: "asc" },
    });
    return docs.map((d) => ({
      ...d,
      documentNumber: decryptPhi(d.documentNumber),
    }));
  } catch (error) {
    throw normalizeDbError(error, "Nationality documents unavailable");
  }
}

export async function upsertNationalityDocument(
  patientProfileId: string,
  globalHealthNumber: string | null,
  input: NationalityInput,
) {
  assertValidSlot(input.slotNumber);

  try {
    const existing = await prisma.patientNationalityDocument.findUnique({
      where: { patientProfileId_slotNumber: { patientProfileId, slotNumber: input.slotNumber } },
      select: { id: true },
    });

    if (!existing) {
      // Guard max-2 by counting current records
      const count = await prisma.patientNationalityDocument.count({
        where: { patientProfileId },
      });
      if (count >= 2) throw new NationalitySlotConflictError();
    }

    const encDocNumber = input.documentNumber ? encryptPhi(input.documentNumber) : null;

    const doc = await prisma.patientNationalityDocument.upsert({
      where: { patientProfileId_slotNumber: { patientProfileId, slotNumber: input.slotNumber } },
      create: {
        patientProfileId,
        globalHealthNumber,
        slotNumber: input.slotNumber,
        nationalityCountry: input.nationalityCountry,
        documentType: input.documentType,
        documentNumber: encDocNumber,
        expiryDate: input.expiryDate ?? null,
      },
      update: {
        nationalityCountry: input.nationalityCountry,
        documentType: input.documentType,
        documentNumber: encDocNumber,
        expiryDate: input.expiryDate ?? null,
      },
    });
    return { ...doc, documentNumber: decryptPhi(doc.documentNumber) };
  } catch (error) {
    if (error instanceof NationalitySlotConflictError) throw error;
    throw normalizeDbError(error, "Could not save nationality document");
  }
}

export async function updateNationalityDocumentFileKeys(
  patientProfileId: string,
  slotNumber: number,
  keys: { frontFileKey?: string | null; backFileKey?: string | null },
) {
  assertValidSlot(slotNumber);
  try {
    const doc = await prisma.patientNationalityDocument.findUnique({
      where: { patientProfileId_slotNumber: { patientProfileId, slotNumber } },
      select: { id: true },
    });
    if (!doc) throw new NationalityNotFoundError();

    return await prisma.patientNationalityDocument.update({
      where: { patientProfileId_slotNumber: { patientProfileId, slotNumber } },
      data: keys,
    });
  } catch (error) {
    if (error instanceof NationalityNotFoundError) throw error;
    throw normalizeDbError(error, "Could not update nationality document");
  }
}

export async function deleteNationalityDocument(patientProfileId: string, slotNumber: number) {
  assertValidSlot(slotNumber);
  try {
    const existing = await prisma.patientNationalityDocument.findUnique({
      where: { patientProfileId_slotNumber: { patientProfileId, slotNumber } },
      select: { id: true },
    });
    if (!existing) throw new NationalityNotFoundError();

    await prisma.patientNationalityDocument.delete({
      where: { patientProfileId_slotNumber: { patientProfileId, slotNumber } },
    });
    return true;
  } catch (error) {
    if (error instanceof NationalityNotFoundError) throw error;
    throw normalizeDbError(error, "Could not delete nationality document");
  }
}

/** Admin: update verification status + notes for a nationality slot. */
export async function adminUpdateNationalityVerification(
  patientProfileId: string,
  slotNumber: number,
  data: {
    verificationStatus: "NOT_VERIFIED" | "PENDING" | "VERIFIED" | "REJECTED";
    adminNotes?: string | null;
    reviewedByAdminId?: string | null;
  },
) {
  assertValidSlot(slotNumber);
  try {
    const existing = await prisma.patientNationalityDocument.findUnique({
      where: { patientProfileId_slotNumber: { patientProfileId, slotNumber } },
      select: { id: true },
    });
    if (!existing) throw new NationalityNotFoundError();

    return await prisma.patientNationalityDocument.update({
      where: { patientProfileId_slotNumber: { patientProfileId, slotNumber } },
      data: {
        verificationStatus: data.verificationStatus,
        adminNotes: data.adminNotes ?? null,
        reviewedByAdminId: data.reviewedByAdminId ?? null,
        reviewedAt: new Date(),
      },
    });
  } catch (error) {
    if (error instanceof NationalityNotFoundError) throw error;
    throw normalizeDbError(error, "Could not update verification status");
  }
}
