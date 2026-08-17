import { prisma } from "../../db/prisma.js";

/**
 * Hard deletion of corporate records — the narrow case where a row is genuinely
 * a mistake (a test company, a mistyped employee) rather than a membership that
 * ended.
 *
 * The distinction that matters: REMOVE sets status REMOVED and keeps
 * everything — that is what ending a membership means, and it is right for
 * anyone who ever used the plan. DELETE destroys the row and, by cascade, its
 * beneficiaries, invites, benefit card and service requests. So deletion is
 * allowed ONLY when nothing clinical or financial points at the record. The
 * checks below are the gate, and both routes re-run them server-side rather
 * than trusting a button that was rendered a minute ago.
 *
 * Note what is NOT deleted and cannot be: appointments, orders and the User
 * account itself. A corporate row is a membership, not the person — deleting it
 * never reaches into someone's medical history. The blocks exist so an
 * appointment or an order is never left pointing at a membership that no longer
 * explains it.
 */

export type DeletionCheck = { deletable: true } | { deletable: false; reason: string };

const KEEP = (reason: string): DeletionCheck => ({ deletable: false, reason });

/**
 * An employee is deletable when they never got as far as using the plan: no
 * pre-assessment appointment, no request that produced an appointment, and no
 * checkout that drew on the corporate benefit — theirs or a family member's.
 */
export async function employeeDeletionCheck(employeeId: string): Promise<DeletionCheck> {
  const employee = await prisma.corporateEmployee.findUnique({
    where: { id: employeeId },
    select: {
      id: true,
      companyId: true,
      userId: true,
      preAssessmentAppointmentId: true,
      beneficiaries: { select: { userId: true } },
    },
  });
  if (!employee) return KEEP("Employee not found");
  if (employee.preAssessmentAppointmentId) {
    return KEEP("This employee has a pre-assessment appointment — remove them instead");
  }

  const bookedRequests = await prisma.corporateServiceRequest.count({
    where: { employeeId, appointmentId: { not: null } },
  });
  if (bookedRequests > 0) {
    return KEEP("This employee has booked a consultation — remove them instead");
  }

  // Corporate-priced order lines for this member or any of their beneficiaries.
  // Scoped by company as well as user: an unrelated company's line must not
  // block a delete here, and a personal (non-corporate) order must not either.
  const userIds = [
    employee.userId,
    ...employee.beneficiaries.map((b) => b.userId),
  ].filter((id): id is string => Boolean(id));
  if (userIds.length > 0) {
    const usedBenefit = await prisma.orderItem.count({
      where: { corporateCompanyId: employee.companyId, order: { userId: { in: userIds } } },
    });
    if (usedBenefit > 0) {
      return KEEP("This employee has used the corporate benefit at checkout — remove them instead");
    }
  }
  return { deletable: true };
}

/**
 * A company is deletable when nothing it owns has history: no billing orders,
 * no corporate-priced checkout line, and no employee who would be blocked on
 * their own. The employee sweep is what stops a company delete from being a
 * back door around the per-employee rule.
 */
export async function companyDeletionCheck(companyId: string): Promise<DeletionCheck> {
  const company = await prisma.corporateCompany.findUnique({
    where: { id: companyId },
    select: { id: true, employees: { select: { id: true } } },
  });
  if (!company) return KEEP("Company not found");

  const [subscriptionOrders, benefitLines] = await Promise.all([
    prisma.order.count({ where: { corporateCompanyId: companyId } }),
    prisma.orderItem.count({ where: { corporateCompanyId: companyId } }),
  ]);
  if (subscriptionOrders > 0) return KEEP("This company has billing orders — expire it instead");
  if (benefitLines > 0) {
    return KEEP("This company's members have used the plan at checkout — expire it instead");
  }

  for (const employee of company.employees) {
    const check = await employeeDeletionCheck(employee.id);
    if (!check.deletable) {
      return KEEP(`An employee still has history (${check.reason.toLowerCase()}) — expire it instead`);
    }
  }
  return { deletable: true };
}

/** Delete after re-checking. Returns the refusal rather than throwing, so the
 *  route can answer 400 with the reason the admin needs to read. */
export async function deleteCorporateEmployee(employeeId: string): Promise<DeletionCheck> {
  const check = await employeeDeletionCheck(employeeId);
  if (!check.deletable) return check;
  // Beneficiaries, invites, the benefit card and open requests cascade.
  await prisma.corporateEmployee.delete({ where: { id: employeeId } });
  return check;
}

export async function deleteCorporateCompany(companyId: string): Promise<DeletionCheck> {
  const check = await companyDeletionCheck(companyId);
  if (!check.deletable) return check;
  // The CORPORATE_ADMIN login is NOT deleted with the company: it is a User row
  // that may be a real person's account. `adminUserId` is SetNull, so the login
  // survives with nothing to administer, and an admin can delete the user
  // separately if that is what they meant.
  await prisma.corporateCompany.delete({ where: { id: companyId } });
  return check;
}
