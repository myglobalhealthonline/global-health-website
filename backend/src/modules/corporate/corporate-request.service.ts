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

export const REQUEST_TYPE_SERVICE_SLUG: Record<CorporateRequestType, string> = {
  ILLNESS_BENEFIT: "corporate-illness-benefit",
  FIT_FOR_WORK: "corporate-fit-for-work",
};

/**
 * Slug of the service the plan assigns to a role (admin-configured on
 * /admin/corporate), or null when the plan has no assignment — callers
 * fall back to the seeded REQUEST_TYPE_SERVICE_SLUG defaults.
 */
export async function planServiceSlug(
  corporatePlanId: string,
  role: CorporatePlanServiceRole,
): Promise<string | null> {
  const row = await prisma.corporatePlanService.findFirst({
    where: { corporatePlanId, role },
    select: { service: { select: { slug: true } } },
  });
  return row?.service.slug ?? null;
}

/** Booking deep link for the employee (site is /{country}/{lang}/…). */
export function requestBookPath(
  countryCode: string,
  type: CorporateRequestType,
  serviceSlug?: string | null,
): string {
  return `/${countryCode.toLowerCase()}/en/book?service=${serviceSlug ?? REQUEST_TYPE_SERVICE_SLUG[type]}`;
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

  const slug =
    (await planServiceSlug(employee.company.planId, opts.type)) ??
    REQUEST_TYPE_SERVICE_SLUG[opts.type];
  const service = await prisma.service.findFirst({
    where: {
      slug,
      visibility: "CORPORATE_REQUEST_ONLY",
      isActive: true,
      country: { code: employee.company.countryCode },
    },
    select: { id: true },
  });
  if (!service) {
    return {
      ok: false,
      status: 409,
      message: `The ${REQUEST_TYPE_LABEL[opts.type]} service is not configured for this country yet`,
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
      serviceId: service.id,
      requestedByUserId: opts.requestedByUserId,
      reason: opts.reason?.trim() || null,
      expiresAt: new Date(Date.now() + REQUEST_TTL_DAYS * 24 * 60 * 60 * 1000),
    },
  });

  // Notify the employee. Email success flips the status to
  // EMPLOYEE_NOTIFIED; failures leave it at REQUESTED for a later resend.
  const bookPath = requestBookPath(employee.company.countryCode, opts.type, slug);
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
