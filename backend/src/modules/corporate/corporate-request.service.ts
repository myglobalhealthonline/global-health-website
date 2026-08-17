import type { CorporatePlanServiceRole, CorporateRequestType } from "@prisma/client";
import { prisma } from "../../db/prisma.js";
import { sendWhatsAppText } from "../../lib/whatsapp/wasender.js";
import {
  corporateRequestText,
  sendCorporateRequestEmail,
} from "./corporate-emails.js";

const REQUEST_TTL_DAYS = 60;

export const REQUEST_TYPE_LABEL: Record<CorporateRequestType, string> = {
  ILLNESS_BENEFIT: "Illness Benefit Consultation",
  FIT_FOR_WORK: "Fit-for-Work Consultation",
};

const REQUEST_TYPE_ROLE: Record<CorporateRequestType, CorporatePlanServiceRole> = {
  ILLNESS_BENEFIT: "ILLNESS_BENEFIT",
  FIT_FOR_WORK: "FIT_FOR_WORK",
};

/**
 * The plan's corporate consultation for a role, scoped to the company's
 * market. A country-pinned row wins over the plan-wide one, so a market with
 * its own assigned doctor is never served the generic row.
 */
export async function planServiceForRole(
  corporatePlanId: string,
  role: CorporatePlanServiceRole,
  countryCode: string,
): Promise<{ id: string; name: string } | null> {
  const rows = await prisma.corporatePlanService.findMany({
    where: {
      corporatePlanId,
      role,
      isActive: true,
      OR: [{ countryCode: null }, { countryCode: countryCode.toLowerCase() }],
    },
    select: { id: true, name: true, countryCode: true },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
  return rows.find((r) => r.countryCode !== null) ?? rows[0] ?? null;
}

/** Where the employee books a corporate consultation: the member portal, not
 *  the public booking funnel — these consultations are not catalogue services. */
export function corporateBookPath(corporateServiceId: string): string {
  return `/account/corporate/book/${corporateServiceId}`;
}

export type CreateRequestResult =
  | { ok: true; requestId: string; status: string }
  | { ok: false; status: number; message: string };

/**
 * Create an Illness-Benefit / Fit-for-Work request for an employee and
 * notify them (email + WhatsApp + in-app bell). Resolves the corporate
 * request-only service for the company's country.
 */
export async function createCorporateRequest(opts: {
  companyId: string;
  employeeId: string;
  type: CorporateRequestType;
  reason?: string;
  requestedByUserId: string;
}): Promise<CreateRequestResult> {
  const employee = await prisma.corporateEmployee.findFirst({
    where: { id: opts.employeeId, companyId: opts.companyId },
    include: { company: true },
  });
  if (!employee) return { ok: false, status: 404, message: "Employee not found" };
  if (["REMOVED", "SUSPENDED", "DRAFT"].includes(employee.status)) {
    return { ok: false, status: 400, message: "Requests can only be created for invited or active employees" };
  }

  const corporateService = await planServiceForRole(
    employee.company.planId,
    REQUEST_TYPE_ROLE[opts.type],
    employee.company.countryCode,
  );
  if (!corporateService) {
    return {
      ok: false,
      status: 409,
      message: `The ${REQUEST_TYPE_LABEL[opts.type]} consultation is not configured on this plan yet`,
    };
  }

  const duplicate = await prisma.corporateServiceRequest.findFirst({
    where: {
      employeeId: employee.id,
      type: opts.type,
      status: { in: ["REQUESTED", "EMPLOYEE_NOTIFIED", "BOOKED"] },
    },
    select: { id: true },
  });
  if (duplicate) {
    return { ok: false, status: 409, message: "An open request of this type already exists for this employee" };
  }

  const request = await prisma.corporateServiceRequest.create({
    data: {
      companyId: opts.companyId,
      employeeId: employee.id,
      type: opts.type,
      corporateServiceId: corporateService.id,
      requestedByUserId: opts.requestedByUserId,
      reason: opts.reason?.trim() || null,
      expiresAt: new Date(Date.now() + REQUEST_TTL_DAYS * 24 * 60 * 60 * 1000),
    },
  });

  // Notify the employee. Email success flips the status to
  // EMPLOYEE_NOTIFIED; failures leave it at REQUESTED for a later resend.
  const bookPath = corporateBookPath(corporateService.id);
  let notified = false;
  try {
    const result = await sendCorporateRequestEmail({
      to: employee.email,
      firstName: employee.firstName,
      companyName: employee.company.name,
      requestLabel: REQUEST_TYPE_LABEL[opts.type],
      bookPath,
    });
    notified = (result as { ok?: boolean }).ok !== false;
  } catch (error) {
    console.error("[corporate] request email failed:", error);
  }
  if (employee.phone) {
    void sendWhatsAppText({
      to: employee.phone,
      message: corporateRequestText({
        firstName: employee.firstName,
        companyName: employee.company.name,
        requestLabel: REQUEST_TYPE_LABEL[opts.type],
        bookPath,
      }),
    }).catch((error) => console.error("[corporate] request whatsapp failed:", error));
  }
  if (employee.userId) {
    void prisma.notification
      .create({
        data: {
          recipientUserId: employee.userId,
          type: "CORPORATE_REQUEST_CREATED",
          payload: {
            title: `${REQUEST_TYPE_LABEL[opts.type]} requested`,
            body: `${employee.company.name} has requested this consultation for you. Book your slot now.`,
            href: bookPath,
          },
        },
      })
      .catch((error) => console.error("[corporate] request bell failed:", error));
  }

  const status = notified ? "EMPLOYEE_NOTIFIED" : "REQUESTED";
  if (notified) {
    await prisma.corporateServiceRequest.update({
      where: { id: request.id },
      data: { status: "EMPLOYEE_NOTIFIED", notifiedAt: new Date() },
    });
  }
  return { ok: true, requestId: request.id, status };
}

export async function cancelCorporateRequest(opts: {
  requestId: string;
  companyId?: string; // scope check for corporate-portal callers
}): Promise<{ ok: boolean; message?: string }> {
  const request = await prisma.corporateServiceRequest.findUnique({
    where: { id: opts.requestId },
  });
  if (!request || (opts.companyId && request.companyId !== opts.companyId)) {
    return { ok: false, message: "Request not found" };
  }
  if (!["REQUESTED", "EMPLOYEE_NOTIFIED"].includes(request.status)) {
    return { ok: false, message: "Only open requests can be cancelled" };
  }
  await prisma.corporateServiceRequest.update({
    where: { id: request.id },
    data: { status: "CANCELLED", cancelledAt: new Date() },
  });
  return { ok: true };
}
