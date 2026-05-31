import { prisma } from "../../db/prisma.js";

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

  return prisma.medicalNote.create({
    data: {
      appointmentId: appt.id,
      patientEmail: appt.email.toLowerCase(),
      content: input.content.trim(),
      consultationType: input.consultationType?.trim() || appt.consultationType,
      createdByDoctorId: input.doctorId,
      createdByName: input.doctorDisplayName,
    },
  });
}

export async function listMedicalNotesForAppointment(appointmentId: string, doctorId: string) {
  const appt = await prisma.appointment.findFirst({
    where: { id: appointmentId, doctorId },
    select: { id: true },
  });
  if (!appt) return null;

  return prisma.medicalNote.findMany({
    where: { appointmentId },
    orderBy: { createdAt: "desc" },
  });
}

export async function listMedicalNotesForPatient(patientEmail: string, doctorId: string) {
  return prisma.medicalNote.findMany({
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
}
