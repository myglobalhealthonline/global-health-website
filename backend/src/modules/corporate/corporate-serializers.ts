import type {
  CorporateBenefitCard,
  CorporateBeneficiary,
  CorporateEmployee,
  CorporateServiceRequest,
} from "@prisma/client";

/** Employee row for corporate-portal + admin tables. NO medical data —
 *  status labels, booleans and counts only (privacy rule §6). */
export function serializeEmployee(
  employee: CorporateEmployee & { _count?: { beneficiaries: number } },
) {
  return {
    id: employee.id,
    firstName: employee.firstName,
    lastName: employee.lastName,
    email: employee.email,
    phone: employee.phone,
    addressLine1: employee.addressLine1,
    addressLine2: employee.addressLine2,
    city: employee.city,
    postalCode: employee.postalCode,
    dateOfBirth: employee.dateOfBirth ? employee.dateOfBirth.toISOString().slice(0, 10) : null,
    employeeCode: employee.employeeCode,
    department: employee.department,
    jobTitle: employee.jobTitle,
    status: employee.status,
    hasAccount: Boolean(employee.userId),
    preAssessmentBooked: Boolean(employee.preAssessmentAppointmentId),
    beneficiaryCount: employee._count?.beneficiaries ?? 0,
    createdAt: employee.createdAt.toISOString(),
  };
}

export function serializeBeneficiary(beneficiary: CorporateBeneficiary) {
  return {
    id: beneficiary.id,
    employeeId: beneficiary.employeeId,
    firstName: beneficiary.firstName,
    lastName: beneficiary.lastName,
    email: beneficiary.email,
    phone: beneficiary.phone,
    relationship: beneficiary.relationship,
    dateOfBirth: beneficiary.dateOfBirth
      ? beneficiary.dateOfBirth.toISOString().slice(0, 10)
      : null,
    status: beneficiary.status,
    hasAccount: Boolean(beneficiary.userId),
    createdAt: beneficiary.createdAt.toISOString(),
  };
}

export function serializeRequest(
  request: CorporateServiceRequest & {
    employee?: { firstName: string; lastName: string; email: string };
  },
) {
  return {
    id: request.id,
    employeeId: request.employeeId,
    employeeName: request.employee
      ? `${request.employee.firstName} ${request.employee.lastName}`
      : undefined,
    type: request.type,
    reason: request.reason,
    status: request.status,
    hasAppointment: Boolean(request.appointmentId),
    expiresAt: request.expiresAt ? request.expiresAt.toISOString() : null,
    createdAt: request.createdAt.toISOString(),
  };
}

export function serializeCard(card: CorporateBenefitCard) {
  return {
    cardNumber: card.cardNumber,
    memberType: card.memberType,
    status: card.status,
    validFrom: card.validFrom.toISOString().slice(0, 10),
    validUntil: card.validUntil.toISOString().slice(0, 10),
  };
}
