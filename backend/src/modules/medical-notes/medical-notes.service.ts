import { prisma } from "../../db/prisma.js";
import { encryptPhi, decryptPhi } from "../../lib/crypto/phi-crypto.js";

/** Decrypt `content` on a MedicalNote row (plaintext-tolerant, no-op-safe). */
function decryptNote<T extends { content: string }>(note: T): T {
  return { ...note, content: decryptPhi(note.content) ?? note.content };
}

export async function createMedicalNote(input: {
  appointmentId: string;
  doctorId: string;
  doctorDisplayName: string;
  content: string;
  consultationType?: string;
}) {
  const appt = await prisma.appointment.findFirst({
    where: { id: input.appointmentId, doctorId: input.doctorId },
    select: {
      id: true,
      email: true,
      consultationType: true,
    },
  });
  if (!appt) return null;

  const note = await prisma.medicalNote.create({
    data: {
      appointmentId: appt.id,
      patientEmail: appt.email.toLowerCase(),
      content: encryptPhi(input.content.trim()) ?? input.content.trim(),
      consultationType: input.consultationType?.trim() || appt.consultationType,
      createdByDoctorId: input.doctorId,
      createdByName: input.doctorDisplayName,
    },
  });
  return decryptNote(note);
}

export async function listMedicalNotesForAppointment(appointmentId: string, doctorId: string) {
  const appt = await prisma.appointment.findFirst({
    where: { id: appointmentId, doctorId },
    select: { id: true },
  });
  if (!appt) return null;

  const notes = await prisma.medicalNote.findMany({
    where: { appointmentId },
    orderBy: { createdAt: "desc" },
  });
  return notes.map(decryptNote);
}

export async function listMedicalNotesForPatient(patientEmail: string, doctorId: string) {
  const notes = await prisma.medicalNote.findMany({
    where: {
      patientEmail: patientEmail.toLowerCase(),
      appointment: { doctorId },
    },
    orderBy: { createdAt: "desc" },
    include: {
      appointment: {
        select: {
          id: true,
          scheduledAt: true,
          createdAt: true,
          consultationType: true,
          symptoms: true,
        },
      },
    },
  });
  return notes.map(decryptNote);
}
