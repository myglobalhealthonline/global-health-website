import { prisma } from "../../db/prisma.js";
import { sendWhatsAppText } from "../../lib/whatsapp/wasender.js";
import {
  cardActivatedText,
  sendCardActivatedEmail,
  sendCompanyNoticeEmail,
  sendMembershipStatusEmail,
} from "./corporate-emails.js";
import {
  canTransitionBeneficiary,
  canTransitionEmployee,
  issueBenefitCard,
  syncCardStatus,
} from "./corporate-shared.js";

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
 * "Employee/beneficiary completed profile" notice to the company contact —
 * one of the required notification events. Called from the invite-accept
 * route once the membership row has been written.
 */
export async function notifyCompanyMemberProfileComplete(
  memberType: "EMPLOYEE" | "BENEFICIARY",
  memberId: string,
): Promise<void> {
  const member =
    memberType === "EMPLOYEE"
      ? await prisma.corporateEmployee.findUnique({
          where: { id: memberId },
          include: { company: true },
        })
      : await prisma.corporateBeneficiary.findUnique({
          where: { id: memberId },
          include: { company: true },
        });
  if (!member) return;
  const who = `${member.firstName} ${member.lastName}`;
  await sendCompanyNoticeEmail({
    to: member.company.contactEmail,
    contactName: member.company.contactName,
    subject: memberType === "EMPLOYEE" ? "Employee registered" : "Beneficiary registered",
    bodyLines: [
      memberType === "EMPLOYEE"
        ? `${who} has accepted their invitation and completed their profile. Next step: their pre-assessment consultation.`
        : `${who} has accepted their beneficiary invitation and completed their profile.`,
    ],
  });
}

/**
 * A company's contract lapsed (daily cron). Tell the company contact and
 * every member whose card just stopped working — an expiry that nobody is
 * told about looks like a broken discount at the checkout.
 */
export async function notifyCompanyExpired(companyId: string): Promise<void> {
  const company = await prisma.corporateCompany.findUnique({
    where: { id: companyId },
    select: {
      name: true,
      contactName: true,
      contactEmail: true,
      employees: {
        where: { status: { in: ["ACTIVE", "SUSPENDED"] } },
        select: { email: true, firstName: true },
      },
      beneficiaries: {
        where: { status: { in: ["ACTIVE", "SUSPENDED"] } },
        select: { email: true, firstName: true },
      },
    },
  });
  if (!company) return;
  await sendCompanyNoticeEmail({
    to: company.contactEmail,
    contactName: company.contactName,
    subject: "Corporate plan expired",
    bodyLines: [
      `The Global Health Corporate Plan for ${company.name} reached its contract end date and is now expired.`,
      "Employee and beneficiary benefit cards and consultation discounts are paused until the contract is renewed.",
    ],
  });
  for (const member of [...company.employees, ...company.beneficiaries]) {
    fireAndForget(
      sendMembershipStatusEmail({
        to: member.email,
        firstName: member.firstName,
        companyName: company.name,
        statusLabel: "expired",
      }),
      "company expiry member email",
    );
  }
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

  // Idempotent no-ops (double-clicked admin button) short-circuit before the
  // transition table, which by design forbids X → X.
  const target = action === "SUSPEND" ? "SUSPENDED" : action === "REACTIVATE" ? "ACTIVE" : "REMOVED";
  if (employee.status === target) return { ok: true };
  if (!canTransitionEmployee(employee.status, target)) {
    return {
      ok: false,
      message:
        action === "SUSPEND"
          ? "Only active members can be suspended"
          : action === "REACTIVATE"
            ? "Only suspended members can be reactivated"
            : "This member cannot be removed",
    };
  }

  if (action === "SUSPEND") {
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

  // REMOVE — terminal. Cards expire, open requests cancel, beneficiaries
  // removed, and every outstanding invite link dies with the membership
  // (otherwise the cron keeps "reminding" people who no longer belong here,
  // and a live token still points at a dead membership).
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
    prisma.corporateInvite.deleteMany({
      where: {
        usedAt: null,
        OR: [{ employeeId }, { beneficiary: { employeeId } }],
      },
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

  const next = action === "SUSPEND" ? "SUSPENDED" : action === "REACTIVATE" ? "ACTIVE" : "REMOVED";
  if (beneficiary.status === next) return { ok: true };
  if (!canTransitionBeneficiary(beneficiary.status, next)) {
    return {
      ok: false,
      message:
        action === "SUSPEND"
          ? "Only active beneficiaries can be suspended"
          : action === "REACTIVATE"
            ? "Only suspended beneficiaries can be reactivated"
            : "This beneficiary cannot be removed",
    };
  }

  if (action === "REACTIVATE") {
    // Must go through activateBeneficiary: `syncCardStatus` is an updateMany,
    // so it silently no-ops when the member has no card row yet (every
    // PROFILE_INCOMPLETE beneficiary). That produced ACTIVE members with a 10%
    // discount and nothing to show at a clinic desk.
    await activateBeneficiary(beneficiaryId);
    return { ok: true };
  }

  if (action === "SUSPEND") {
    await prisma.corporateBeneficiary.update({
      where: { id: beneficiaryId },
      data: { status: next },
    });
    await syncCardStatus({ beneficiaryId, status: "SUSPENDED" });
    return { ok: true };
  }

  await prisma.$transaction([
    prisma.corporateBeneficiary.update({
      where: { id: beneficiaryId },
      data: { status: "REMOVED" },
    }),
    // Same reason as the employee path: a removed member keeps no live token.
    prisma.corporateInvite.deleteMany({ where: { beneficiaryId, usedAt: null } }),
  ]);
  await syncCardStatus({ beneficiaryId, status: "EXPIRED" });
  return { ok: true };
}

/** Thrown when another booking consumed the open request first. */
export class CorporateRequestAlreadyClaimedError extends Error {
  constructor() {
    super("This consultation request has already been booked");
    this.name = "CorporateRequestAlreadyClaimedError";
  }
}

/**
 * Consume ONE open corporate service request and bind it to the appointment,
 * atomically. Must run inside the appointment's own transaction: the
 * bookability gate only reads the request, so without this claim two
 * simultaneous bookings both saw it open and both went through.
 */
export async function claimCorporateRequest(
  tx: {
    corporateServiceRequest: { updateMany: (args: never) => Promise<{ count: number }> };
  },
  requestId: string,
  appointmentId: string,
): Promise<void> {
  const claimed = await tx.corporateServiceRequest.updateMany({
    where: { id: requestId, status: { in: ["REQUESTED", "EMPLOYEE_NOTIFIED"] } },
    data: { status: "BOOKED", appointmentId },
  } as never);
  if (claimed.count === 0) throw new CorporateRequestAlreadyClaimedError();
}

/**
 * Booking hook — call after a corporate-plan consultation is booked from the
 * member portal. Links the appointment to the employee (pre-assessment) or to
 * the open company request, and advances the relevant status. Safe to call for
 * any appointment; no-ops for ordinary catalogue bookings.
 *
 * `employeeId` is the row the bookability gate already resolved, passed through
 * by the portal booking path. Callers that mint an appointment without running
 * that gate (paid-order webhook, admin manual booking) omit it and fall back to
 * the lookup below.
 */
export async function onCorporateAppointmentCreated(
  appointmentId: string,
  employeeId?: string,
): Promise<void> {
  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    select: {
      id: true,
      userId: true,
      email: true,
      countryCode: true,
      corporateService: { select: { id: true, role: true, corporatePlanId: true } },
    },
  });
  if (!appointment?.corporateService) return;
  const { role } = appointment.corporateService;

  if (role === "PRE_ASSESSMENT") {
    // Pre-assessment: use the employee the gate already identified when we have
    // it, else match by linked user first and fall back to the invite email.
    //
    // The fallback is scoped to the consultation's PLAN, not to the booking's
    // country. Country scoping was wrong: `Appointment.countryCode` falls back
    // to the assigned DOCTOR's market for an "all countries" consultation, so a
    // company in one market whose consultation is delivered by a doctor in
    // another never matched — the booking succeeded, was free and correctly
    // doctored, but the employee stayed stuck before PREASSESSMENT_BOOKED with
    // no error anywhere. The plan is what actually decides whose pre-assessment
    // this is, and it still separates someone employed by two companies.
    const employee = await prisma.corporateEmployee.findFirst({
      where: {
        status: { in: ["PROFILE_COMPLETE", "PREASSESSMENT_PENDING", "PREASSESSMENT_BOOKED"] },
        ...(employeeId
          ? { id: employeeId }
          : {
              company: { planId: appointment.corporateService.corporatePlanId },
              OR: [
                ...(appointment.userId ? [{ userId: appointment.userId }] : []),
                { email: { equals: appointment.email, mode: "insensitive" as const } },
              ],
            }),
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

  // Attach to the oldest open company request for this user + consultation,
  // when one exists. A member booking with no open request is still valid —
  // corporate consultations carry no usage limit.
  const request = await prisma.corporateServiceRequest.findFirst({
    where: {
      corporateServiceId: appointment.corporateService.id,
      status: { in: ["REQUESTED", "EMPLOYEE_NOTIFIED"] },
      employee: appointment.userId
        ? { userId: appointment.userId }
        : { email: { equals: appointment.email, mode: "insensitive" } },
    },
    orderBy: { createdAt: "asc" },
  });
  if (!request) return;
  // updateMany + status guard, not update: this hook also runs from the paid
  // -order webhook, where two orders can land on one open request.
  await prisma.corporateServiceRequest.updateMany({
    where: { id: request.id, status: { in: ["REQUESTED", "EMPLOYEE_NOTIFIED"] } },
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

  if (newStatus === "CANCELLED") {
    // Patient "Cancel", admin status change and the doctor portal all funnel
    // through here, and none of them told anyone. The import is INSIDE the
    // fire-and-forget, not awaited ahead of it: a module that failed to load
    // must not stop the employee below being put back to PREASSESSMENT_PENDING,
    // which is what lets them rebook at all.
    fireAndForget(
      import("./corporate-booking-notifications.js").then((m) =>
        m.notifyCorporateBookingCancelled(appointmentId),
      ),
      "cancellation notice",
    );
  }

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
