import { prisma } from "../../db/prisma.js";
import { sendWhatsAppText } from "../../lib/whatsapp/wasender.js";
import {
  cardActivatedText,
  sendCardActivatedEmail,
  sendCompanyNoticeEmail,
  sendMembershipStatusEmail,
} from "./corporate-emails.js";
import { issueBenefitCard, syncCardStatus } from "./corporate-shared.js";

function fireAndForget(promise: Promise<unknown>, label: string): void {
  void promise.catch((error) => {
    // Notifications must never break the state change that triggered them.
    console.error(`[corporate] ${label} failed:`, error);
  });
}

async function notifyMember(opts: {
  userId: string | null;
  title: string;
  body: string;
  href: string;
}): Promise<void> {
  if (!opts.userId) return;
  await prisma.notification.create({
    data: {
      recipientUserId: opts.userId,
      type: "CORPORATE_MEMBERSHIP",
      payload: { title: opts.title, body: opts.body, href: opts.href },
    },
  });
}

/**
 * Employee reached ACTIVE (pre-assessment completed or admin override):
 * issue the benefit card + notify member and company. Idempotent.
 */
export async function activateEmployee(employeeId: string): Promise<void> {
  const employee = await prisma.corporateEmployee.findUnique({
    where: { id: employeeId },
    include: { company: true, user: { select: { id: true, email: true } }, benefitCard: true },
  });
  if (!employee) return;
  if (employee.status !== "ACTIVE") {
    await prisma.corporateEmployee.update({
      where: { id: employeeId },
      data: { status: "ACTIVE" },
    });
  }
  await issueBenefitCard({
    memberType: "EMPLOYEE",
    employeeId,
    company: employee.company,
  });
  const card = await prisma.corporateBenefitCard.findUnique({ where: { employeeId } });
  if (card) {
    fireAndForget(
      sendCardActivatedEmail({
        to: employee.email,
        firstName: employee.firstName,
        companyName: employee.company.name,
        cardNumber: card.cardNumber,
      }),
      "card-activated email",
    );
    if (employee.phone) {
      fireAndForget(
        sendWhatsAppText({
          to: employee.phone,
          message: cardActivatedText({
            firstName: employee.firstName,
            companyName: employee.company.name,
            cardNumber: card.cardNumber,
          }),
        }),
        "card-activated whatsapp",
      );
    }
    fireAndForget(
      notifyMember({
        userId: employee.userId,
        title: "Corporate membership active",
        body: `Your ${employee.company.name} membership is active — benefit card ${card.cardNumber}.`,
        href: "/account/corporate",
      }),
      "card-activated bell",
    );
  }
  fireAndForget(
    sendCompanyNoticeEmail({
      to: employee.company.contactEmail,
      contactName: employee.company.contactName,
      subject: "Employee membership activated",
      bodyLines: [
        `${employee.firstName} ${employee.lastName} completed the pre-assessment and is now an active member.`,
      ],
    }),
    "company activation notice",
  );
}

/** Beneficiary reached ACTIVE (profile complete): card + notices. Idempotent. */
export async function activateBeneficiary(beneficiaryId: string): Promise<void> {
  const beneficiary = await prisma.corporateBeneficiary.findUnique({
    where: { id: beneficiaryId },
    include: { company: true },
  });
  if (!beneficiary) return;
  if (beneficiary.status !== "ACTIVE") {
    await prisma.corporateBeneficiary.update({
      where: { id: beneficiaryId },
      data: { status: "ACTIVE" },
    });
  }
  await issueBenefitCard({
    memberType: "BENEFICIARY",
    beneficiaryId,
    company: beneficiary.company,
  });
  const card = await prisma.corporateBenefitCard.findUnique({ where: { beneficiaryId } });
  if (card) {
    fireAndForget(
      sendCardActivatedEmail({
        to: beneficiary.email,
        firstName: beneficiary.firstName,
        companyName: beneficiary.company.name,
        cardNumber: card.cardNumber,
      }),
      "beneficiary card email",
    );
    if (beneficiary.phone) {
      fireAndForget(
        sendWhatsAppText({
          to: beneficiary.phone,
          message: cardActivatedText({
            firstName: beneficiary.firstName,
            companyName: beneficiary.company.name,
            cardNumber: card.cardNumber,
          }),
        }),
        "beneficiary card whatsapp",
      );
    }
    fireAndForget(
      notifyMember({
        userId: beneficiary.userId,
        title: "Benefit card active",
        body: `Your ${beneficiary.company.name} beneficiary card ${card.cardNumber} is active.`,
        href: "/account/corporate",
      }),
      "beneficiary card bell",
    );
  }
}

/**
 * Suspend / reactivate / remove an employee, cascading to their
 * beneficiaries and everyone's cards. REMOVED is terminal.
 */
export async function setEmployeeStanding(
  employeeId: string,
  action: "SUSPEND" | "REACTIVATE" | "REMOVE",
): Promise<{ ok: boolean; message?: string }> {
  const employee = await prisma.corporateEmployee.findUnique({
    where: { id: employeeId },
    include: { company: true, beneficiaries: true },
  });
  if (!employee) return { ok: false, message: "Employee not found" };
  if (employee.status === "REMOVED") return { ok: false, message: "Employee already removed" };

  if (action === "SUSPEND") {
    if (employee.status !== "ACTIVE" && employee.status !== "SUSPENDED") {
      return { ok: false, message: "Only active members can be suspended" };
    }
    await prisma.$transaction([
      prisma.corporateEmployee.update({ where: { id: employeeId }, data: { status: "SUSPENDED" } }),
      prisma.corporateBeneficiary.updateMany({
        where: { employeeId, status: "ACTIVE" },
        data: { status: "SUSPENDED" },
      }),
    ]);
    await syncCardStatus({ employeeId, status: "SUSPENDED" });
    await prisma.corporateBenefitCard.updateMany({
      where: { beneficiary: { employeeId } },
      data: { status: "SUSPENDED" },
    });
    fireAndForget(
      sendMembershipStatusEmail({
        to: employee.email,
        firstName: employee.firstName,
        companyName: employee.company.name,
        statusLabel: "suspended",
      }),
      "suspend email",
    );
    return { ok: true };
  }

  if (action === "REACTIVATE") {
    if (employee.status !== "SUSPENDED") {
      return { ok: false, message: "Only suspended members can be reactivated" };
    }
    await prisma.$transaction([
      prisma.corporateEmployee.update({ where: { id: employeeId }, data: { status: "ACTIVE" } }),
      prisma.corporateBeneficiary.updateMany({
        where: { employeeId, status: "SUSPENDED" },
        data: { status: "ACTIVE" },
      }),
    ]);
    await syncCardStatus({ employeeId, status: "ACTIVE" });
    await prisma.corporateBenefitCard.updateMany({
      where: { beneficiary: { employeeId }, status: "SUSPENDED" },
      data: { status: "ACTIVE" },
    });
    fireAndForget(
      sendMembershipStatusEmail({
        to: employee.email,
        firstName: employee.firstName,
        companyName: employee.company.name,
        statusLabel: "reactivated",
      }),
      "reactivate email",
    );
    return { ok: true };
  }

  // REMOVE — terminal. Cards expire, open requests cancel, beneficiaries removed.
  await prisma.$transaction([
    prisma.corporateEmployee.update({ where: { id: employeeId }, data: { status: "REMOVED" } }),
    prisma.corporateBeneficiary.updateMany({
      where: { employeeId, status: { not: "REMOVED" } },
      data: { status: "REMOVED" },
    }),
    prisma.corporateServiceRequest.updateMany({
      where: { employeeId, status: { in: ["REQUESTED", "EMPLOYEE_NOTIFIED"] } },
      data: { status: "CANCELLED", cancelledAt: new Date() },
    }),
  ]);
  await syncCardStatus({ employeeId, status: "EXPIRED" });
  await prisma.corporateBenefitCard.updateMany({
    where: { beneficiary: { employeeId } },
    data: { status: "EXPIRED" },
  });
  fireAndForget(
    sendMembershipStatusEmail({
      to: employee.email,
      firstName: employee.firstName,
      companyName: employee.company.name,
      statusLabel: "expired",
    }),
    "remove email",
  );
  return { ok: true };
}

export async function setBeneficiaryStanding(
  beneficiaryId: string,
  action: "SUSPEND" | "REACTIVATE" | "REMOVE",
): Promise<{ ok: boolean; message?: string }> {
  const beneficiary = await prisma.corporateBeneficiary.findUnique({
    where: { id: beneficiaryId },
    include: { company: true },
  });
  if (!beneficiary) return { ok: false, message: "Beneficiary not found" };
  if (beneficiary.status === "REMOVED") return { ok: false, message: "Already removed" };

  if (action === "SUSPEND" || action === "REACTIVATE") {
    const expected = action === "SUSPEND" ? "ACTIVE" : "SUSPENDED";
    const next = action === "SUSPEND" ? "SUSPENDED" : "ACTIVE";
    if (beneficiary.status !== expected) {
      return { ok: false, message: `Only ${expected.toLowerCase()} beneficiaries can be ${action.toLowerCase()}d` };
    }
    await prisma.corporateBeneficiary.update({
      where: { id: beneficiaryId },
      data: { status: next },
    });
    await syncCardStatus({ beneficiaryId, status: next });
    return { ok: true };
  }

  await prisma.corporateBeneficiary.update({
    where: { id: beneficiaryId },
    data: { status: "REMOVED" },
  });
  await syncCardStatus({ beneficiaryId, status: "EXPIRED" });
  return { ok: true };
}

/**
 * Booking hook — call after an appointment is created for a corporate
 * service (checkout mint or direct create). Links the appointment to
 * the employee (pre-assessment) or the open request, and advances the
 * relevant status. Safe to call for any appointment; no-ops for
 * non-corporate services.
 */
export async function onCorporateAppointmentCreated(appointmentId: string): Promise<void> {
  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    select: {
      id: true,
      userId: true,
      email: true,
      service: { select: { id: true, visibility: true } },
    },
  });
  if (!appointment?.service) return;
  const { visibility } = appointment.service;
  if (visibility === "PUBLIC" || visibility === "ADMIN_ONLY") return;

  if (visibility === "CORPORATE_ONLY") {
    // Pre-assessment: match by linked user first, fall back to invite email.
    const employee = await prisma.corporateEmployee.findFirst({
      where: {
        status: { in: ["PROFILE_COMPLETE", "PREASSESSMENT_PENDING", "PREASSESSMENT_BOOKED"] },
        OR: [
          ...(appointment.userId ? [{ userId: appointment.userId }] : []),
          { email: { equals: appointment.email, mode: "insensitive" as const } },
        ],
      },
      include: { company: true },
    });
    if (!employee) return;
    await prisma.corporateEmployee.update({
      where: { id: employee.id },
      data: { preAssessmentAppointmentId: appointment.id, status: "PREASSESSMENT_BOOKED" },
    });
    fireAndForget(
      sendCompanyNoticeEmail({
        to: employee.company.contactEmail,
        contactName: employee.company.contactName,
        subject: "Pre-assessment booked",
        bodyLines: [
          `${employee.firstName} ${employee.lastName} has booked their pre-assessment consultation.`,
        ],
      }),
      "pre-assessment booked notice",
    );
    return;
  }

  // CORPORATE_REQUEST_ONLY — attach to the oldest open request for this
  // user + service.
  const request = await prisma.corporateServiceRequest.findFirst({
    where: {
      serviceId: appointment.service.id,
      status: { in: ["REQUESTED", "EMPLOYEE_NOTIFIED"] },
      employee: appointment.userId
        ? { userId: appointment.userId }
        : { email: { equals: appointment.email, mode: "insensitive" } },
    },
    orderBy: { createdAt: "asc" },
  });
  if (!request) return;
  await prisma.corporateServiceRequest.update({
    where: { id: request.id },
    data: { appointmentId: appointment.id, status: "BOOKED" },
  });
}

/**
 * Appointment status hook — call whenever AppointmentStatus changes.
 * COMPLETED pre-assessment ⇒ employee ACTIVE (+card); COMPLETED
 * request appointment ⇒ request COMPLETED. No-op otherwise.
 */
export async function onCorporateAppointmentStatusChanged(
  appointmentId: string,
  newStatus: string,
): Promise<void> {
  if (newStatus !== "COMPLETED" && newStatus !== "CANCELLED") return;

  const employee = await prisma.corporateEmployee.findUnique({
    where: { preAssessmentAppointmentId: appointmentId },
    select: { id: true, status: true },
  });
  if (employee && employee.status === "PREASSESSMENT_BOOKED") {
    if (newStatus === "COMPLETED") {
      await activateEmployee(employee.id);
    } else {
      // Cancelled pre-assessment: back to pending so they can rebook.
      await prisma.corporateEmployee.update({
        where: { id: employee.id },
        data: { status: "PREASSESSMENT_PENDING", preAssessmentAppointmentId: null },
      });
    }
  }

  const request = await prisma.corporateServiceRequest.findUnique({
    where: { appointmentId },
    include: { company: true, employee: true },
  });
  if (request && request.status === "BOOKED") {
    if (newStatus === "COMPLETED") {
      await prisma.corporateServiceRequest.update({
        where: { id: request.id },
        data: { status: "COMPLETED", completedAt: new Date() },
      });
      fireAndForget(
        sendCompanyNoticeEmail({
          to: request.company.contactEmail,
          contactName: request.company.contactName,
          subject: "Requested consultation completed",
          bodyLines: [
            `The requested consultation for ${request.employee.firstName} ${request.employee.lastName} has been completed.`,
          ],
        }),
        "request completed notice",
      );
    } else {
      // Cancelled appointment reopens the request for rebooking.
      await prisma.corporateServiceRequest.update({
        where: { id: request.id },
        data: { status: "EMPLOYEE_NOTIFIED", appointmentId: null },
      });
    }
  }
}
