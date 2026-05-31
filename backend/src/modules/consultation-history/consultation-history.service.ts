import { GeneratedDocumentType } from "@prisma/client";
import { prisma } from "../../db/prisma.js";
import { isVisibleInHistory } from "../generated-documents/document-template-utils.js";

export async function getPatientConsultationHistory(patientEmail: string, doctorId: string) {
  const email = patientEmail.toLowerCase().trim();

  const appointments = await prisma.appointment.findMany({
    where: { email, doctorId },
    select: {
      id: true,
      scheduledAt: true,
      createdAt: true,
      consultationType: true,
      symptoms: true,
    },
    orderBy: { scheduledAt: "desc" },
  });

  const appointmentIds = appointments.map((a) => a.id);

  const [medicalNotes, generatedDocs, uploads] = await Promise.all([
    prisma.medicalNote.findMany({
      where: {
        patientEmail: email,
        appointmentId: { in: appointmentIds },
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
    }),
    prisma.generatedDocument.findMany({
      where: {
        patientEmail: email,
        appointmentId: { in: appointmentIds },
        doctorId,
      },
      orderBy: { createdAt: "desc" },
      include: {
        appointment: {
          select: {
            id: true,
            scheduledAt: true,
            createdAt: true,
            consultationType: true,
          },
        },
      },
    }),
    prisma.appointmentDocument.findMany({
      where: {
        appointmentId: { in: appointmentIds },
        doctorId,
      },
      orderBy: { createdAt: "desc" },
      include: {
        appointment: {
          select: {
            id: true,
            scheduledAt: true,
            createdAt: true,
            consultationType: true,
          },
        },
      },
    }),
  ]);

  const historyDocs = generatedDocs.filter((d) =>
    isVisibleInHistory(d.documentType, d.sentToPatient),
  );

  const byType = (type: GeneratedDocumentType) =>
    historyDocs
      .filter((d) => d.documentType === type)
      .map((d) => ({
        id: d.id,
        appointmentId: d.appointmentId,
        fileName: d.fileName,
        sentToPatient: d.sentToPatient,
        createdAt: d.createdAt.toISOString(),
        sessionDate: d.appointment.scheduledAt?.toISOString() ?? d.appointment.createdAt.toISOString(),
        consultationType: d.appointment.consultationType,
      }));

  return {
    medicalNotes: medicalNotes.map((n) => ({
      id: n.id,
      appointmentId: n.appointmentId,
      content: n.content,
      consultationType: n.consultationType,
      createdByName: n.createdByName,
      createdAt: n.createdAt.toISOString(),
      sessionDate:
        n.appointment.scheduledAt?.toISOString() ?? n.appointment.createdAt.toISOString(),
      symptoms: n.appointment.symptoms,
    })),
    generatedDocuments: {
      examsPrescriptions: byType("EXAMS_PRESCRIPTION"),
      absenceCertificates: byType("ABSENCE_CERTIFICATE"),
      medicinePrescriptions: byType("PRESCRIPTION"),
      other: byType("OTHER"),
    },
    uploadedFiles: uploads.map((u) => ({
      id: u.id,
      appointmentId: u.appointmentId,
      label: u.label,
      fileName: u.label,
      createdAt: u.createdAt.toISOString(),
      sessionDate:
        u.appointment.scheduledAt?.toISOString() ?? u.appointment.createdAt.toISOString(),
      consultationType: u.appointment.consultationType,
    })),
  };
}
