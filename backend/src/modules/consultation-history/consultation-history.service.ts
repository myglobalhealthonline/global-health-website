import { GeneratedDocumentType } from "@prisma/client";
import { prisma } from "../../db/prisma.js";
import { decryptPhi } from "../../lib/crypto/phi-crypto.js";
import {
  formatConsultationTypeLabel,
  formatOrderRef,
  formatSessionParts,
  generatedDocumentTitle,
  GENERATED_DOCUMENT_TYPE_LABELS,
  uploadFileTypeLabel,
} from "./consultation-history-display.js";

type OrderRef = { id: string; orderNumber: string | null };

async function loadOrderRefsByAppointmentId(
  appointmentIds: string[],
): Promise<Map<string, OrderRef>> {
  const map = new Map<string, OrderRef>();
  if (appointmentIds.length === 0) return map;

  const [orders, orderItems] = await Promise.all([
    prisma.order.findMany({
      where: { appointmentIds: { hasSome: appointmentIds } },
      select: { id: true, orderNumber: true, appointmentIds: true },
    }),
    prisma.orderItem.findMany({
      where: { appointmentId: { in: appointmentIds } },
      select: { appointmentId: true, order: { select: { id: true, orderNumber: true } } },
    }),
  ]);

  for (const o of orders) {
    for (const aid of o.appointmentIds) {
      if (appointmentIds.includes(aid)) {
        map.set(aid, { id: o.id, orderNumber: o.orderNumber });
      }
    }
  }
  for (const item of orderItems) {
    if (item.appointmentId) {
      map.set(item.appointmentId, {
        id: item.order.id,
        orderNumber: item.order.orderNumber,
      });
    }
  }
  return map;
}

function mapGeneratedRow(
  d: {
    id: string;
    appointmentId: string;
    fileName: string;
    documentType: GeneratedDocumentType;
    sentToPatient: boolean;
    metadata: unknown;
    createdAt: Date;
    appointment: {
      scheduledAt: Date | null;
      createdAt: Date;
      consultationType: string;
    };
    doctor: { fullName: string };
  },
  orderRefByAppointment: Map<string, OrderRef>,
) {
  const { sessionDate, sessionTime, sessionIso } = formatSessionParts(
    d.appointment.scheduledAt,
    d.appointment.createdAt,
  );
  const orderId = orderRefByAppointment.get(d.appointmentId);
  return {
    id: d.id,
    appointmentId: d.appointmentId,
    fileName: generatedDocumentTitle(d.documentType, d.fileName, d.metadata),
    documentType: d.documentType,
    fileTypeLabel: GENERATED_DOCUMENT_TYPE_LABELS[d.documentType],
    sentToPatient: d.sentToPatient,
    createdAt: d.createdAt.toISOString(),
    sessionDate,
    sessionTime,
    sessionIso,
    orderNumber: formatOrderRef(d.appointmentId, orderId),
    consultationType: d.appointment.consultationType,
    consultationTypeLabel: formatConsultationTypeLabel(d.appointment.consultationType),
    uploadedBy: d.doctor.fullName,
    pdfUrl: `/api/doctor/documents/generated/${d.id}/pdf`,
  };
}

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
  const orderRefByAppointment = await loadOrderRefsByAppointmentId(appointmentIds);

  const [medicalNotes, consultations, generatedDocs, uploads] = await Promise.all([
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
    // Per-appointment SOAP note the doctor writes in the Consultation tab.
    // Surfaced alongside medical notes / documents so the patient record
    // shows the clinical narrative, not just the artefacts generated from it.
    prisma.consultation.findMany({
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
        doctor: { select: { fullName: true } },
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
        doctor: { select: { fullName: true } },
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
        doctor: { select: { fullName: true } },
      },
    }),
  ]);

  const generatedRows = generatedDocs.map((d) => mapGeneratedRow(d, orderRefByAppointment));

  // An untouched DRAFT consultation row is auto-created for every appointment,
  // so only surface consults that actually carry written content.
  const consultationRows = consultations
    .filter((c) =>
      Boolean(
        c.chiefComplaint?.trim() ||
          c.subjective?.trim() ||
          c.objective?.trim() ||
          c.assessment?.trim() ||
          c.plan?.trim(),
      ),
    )
    .map((c) => {
      const { sessionDate, sessionTime, sessionIso } = formatSessionParts(
        c.appointment.scheduledAt,
        c.appointment.createdAt,
      );
      const orderId = orderRefByAppointment.get(c.appointmentId);
      return {
        id: c.id,
        appointmentId: c.appointmentId,
        chiefComplaint: c.chiefComplaint,
        subjective: c.subjective,
        objective: c.objective,
        assessment: c.assessment,
        plan: c.plan,
        status: c.status,
        signedAt: c.signedAt ? c.signedAt.toISOString() : null,
        createdByName: c.doctor.fullName,
        createdAt: c.createdAt.toISOString(),
        sessionDate,
        sessionTime,
        sessionIso,
        orderNumber: formatOrderRef(c.appointmentId, orderId),
        consultationType: c.appointment.consultationType,
        consultationTypeLabel: formatConsultationTypeLabel(c.appointment.consultationType),
      };
    });

  const byType = (type: GeneratedDocumentType) =>
    generatedRows.filter((r) => r.documentType === type);

  return {
    medicalNotes: medicalNotes.map((n) => {
      const { sessionDate, sessionTime, sessionIso } = formatSessionParts(
        n.appointment.scheduledAt,
        n.appointment.createdAt,
      );
      const orderId = orderRefByAppointment.get(n.appointmentId);
      return {
        id: n.id,
        appointmentId: n.appointmentId,
        content: decryptPhi(n.content) ?? n.content,
        consultationType: n.consultationType,
        consultationTypeLabel: formatConsultationTypeLabel(
          n.consultationType ?? n.appointment.consultationType,
        ),
        createdByName: n.createdByName,
        createdAt: n.createdAt.toISOString(),
        sessionDate,
        sessionTime,
        sessionIso,
        orderNumber: formatOrderRef(n.appointmentId, orderId),
        symptoms: n.appointment.symptoms,
      };
    }),
    consultationNotes: consultationRows,
    generatedDocuments: {
      total: generatedRows.length,
      rows: generatedRows,
      examsPrescriptions: byType("EXAMS_PRESCRIPTION"),
      absenceCertificates: byType("ABSENCE_CERTIFICATE"),
      medicinePrescriptions: byType("PRESCRIPTION"),
      other: byType("OTHER"),
    },
    uploadedFiles: uploads.map((u) => {
      const { sessionDate, sessionTime, sessionIso } = formatSessionParts(
        u.appointment.scheduledAt,
        u.appointment.createdAt,
      );
      const orderId = orderRefByAppointment.get(u.appointmentId);
      return {
        id: u.id,
        appointmentId: u.appointmentId,
        label: u.label,
        fileName: u.label,
        mimetype: u.mimetype,
        fileTypeLabel: uploadFileTypeLabel(u.mimetype),
        byteSize: u.byteSize,
        createdAt: u.createdAt.toISOString(),
        sessionDate,
        sessionTime,
        sessionIso,
        orderNumber: formatOrderRef(u.appointmentId, orderId),
        consultationType: u.appointment.consultationType,
        consultationTypeLabel: formatConsultationTypeLabel(u.appointment.consultationType),
        uploadedBy: u.doctor.fullName,
        viewUrl: `/api/doctor/documents/${u.id}/download`,
      };
    }),
  };
}
