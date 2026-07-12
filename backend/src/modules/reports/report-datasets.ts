import { prisma } from "../../db/prisma.js";
import {
  fmtDate,
  fmtDateTime,
  fmtMoney,
  type ReportRow,
  type ReportTable,
} from "./report-formatters.js";

/**
 * Query builders for the list reports exported from the doctor + admin
 * portals. Each returns a `ReportTable` the route serialises to CSV / PDF.
 *
 * Doctor-scoped builders take a `doctorId` and NEVER read another doctor's
 * rows. Admin builders are global with optional narrowing filters.
 */

/** Hard cap per export — protects the DB + response size from an unbounded
 *  pull. The route surfaces `truncated` when the cap is hit. */
const ROW_LIMIT = 10_000;

export type DatasetKey = "services" | "patients" | "appointments" | "payout";

export type ReportFilters = {
  from?: Date;
  to?: Date;
  status?: string;
  paymentStatus?: string;
  consultationType?: string;
  /** Admin-only narrowing. */
  doctorId?: string;
  countryCode?: string;
};

function rangeWhere(filters: ReportFilters) {
  if (!filters.from && !filters.to) return undefined;
  return {
    ...(filters.from ? { gte: filters.from } : {}),
    ...(filters.to ? { lte: filters.to } : {}),
  };
}

function rangeLabel(filters: ReportFilters): string {
  if (filters.from || filters.to) {
    const from = filters.from ? fmtDate(filters.from) : "—";
    const to = filters.to ? fmtDate(filters.to) : "—";
    return `${from} → ${to}`;
  }
  return "last 30 days";
}

// ── Doctor: services provided ────────────────────────────────────────────────

export async function doctorServicesReport(
  doctorId: string,
  doctorName: string,
): Promise<ReportTable> {
  const rows = await prisma.serviceDoctor.findMany({
    where: { doctorId },
    take: ROW_LIMIT + 1,
    orderBy: [{ service: { name: "asc" } }],
    select: {
      status: true,
      isActive: true,
      doctorAmountCents: true,
      service: {
        select: {
          name: true,
          kind: true,
          basePriceCents: true,
          currencyCode: true,
          country: { select: { name: true } },
        },
      },
    },
  });
  const truncated = rows.length > ROW_LIMIT;
  const capped = truncated ? rows.slice(0, ROW_LIMIT) : rows;

  return {
    title: "Services provided",
    subtitle: doctorName,
    generatedAt: new Date().toISOString(),
    truncated,
    columns: [
      { key: "service", label: "Service" },
      { key: "kind", label: "Type" },
      { key: "country", label: "Country" },
      { key: "basePrice", label: "Base price", align: "right" },
      { key: "payout", label: "Your payout", align: "right" },
      { key: "status", label: "Assignment" },
      { key: "active", label: "Active" },
    ],
    rows: capped.map((r) => ({
      service: r.service.name,
      kind: r.service.kind,
      country: r.service.country.name,
      basePrice: fmtMoney(r.service.basePriceCents, r.service.currencyCode),
      payout: fmtMoney(r.doctorAmountCents, r.service.currencyCode),
      status: r.status,
      active: r.isActive ? "Yes" : "No",
    })),
  };
}

// ── Doctor: patients seen ────────────────────────────────────────────────────

export async function doctorPatientsReport(
  doctorId: string,
  doctorName: string,
  filters: ReportFilters,
): Promise<ReportTable> {
  const createdAt = rangeWhere(filters);
  // Load bounded appointment contacts, then fold to one row per patient email
  // in memory — avoids groupBy losing the name/phone columns.
  const appts = await prisma.appointment.findMany({
    where: {
      doctorId,
      ...(createdAt ? { createdAt } : {}),
    },
    take: ROW_LIMIT + 1,
    orderBy: { createdAt: "desc" },
    select: {
      fullName: true,
      email: true,
      phone: true,
      createdAt: true,
    },
  });
  const truncated = appts.length > ROW_LIMIT;
  const capped = truncated ? appts.slice(0, ROW_LIMIT) : appts;

  const byEmail = new Map<
    string,
    { fullName: string; email: string; phone: string | null; count: number; last: Date }
  >();
  for (const a of capped) {
    const key = a.email.toLowerCase();
    const existing = byEmail.get(key);
    if (existing) {
      existing.count += 1;
      if (a.createdAt > existing.last) existing.last = a.createdAt;
    } else {
      byEmail.set(key, {
        fullName: a.fullName,
        email: a.email,
        phone: a.phone,
        count: 1,
        last: a.createdAt,
      });
    }
  }
  const patients = Array.from(byEmail.values()).sort((a, b) =>
    a.fullName.localeCompare(b.fullName),
  );

  return {
    title: "Patients",
    subtitle: `${doctorName} · ${rangeLabel(filters)}`,
    generatedAt: new Date().toISOString(),
    truncated,
    columns: [
      { key: "name", label: "Patient" },
      { key: "email", label: "Email" },
      { key: "phone", label: "Phone" },
      { key: "count", label: "Appointments", align: "right" },
      { key: "last", label: "Last appointment" },
    ],
    rows: patients.map((p) => ({
      name: p.fullName,
      email: p.email,
      phone: p.phone ?? "",
      count: p.count,
      last: fmtDate(p.last),
    })),
  };
}

// ── Doctor: appointments ─────────────────────────────────────────────────────

export async function doctorAppointmentsReport(
  doctorId: string,
  doctorName: string,
  filters: ReportFilters,
): Promise<ReportTable> {
  const createdAt = rangeWhere(filters);
  const rows = await prisma.appointment.findMany({
    where: {
      doctorId,
      ...(createdAt ? { createdAt } : {}),
      ...(filters.status ? { status: filters.status as never } : {}),
      ...(filters.paymentStatus ? { paymentStatus: filters.paymentStatus as never } : {}),
      ...(filters.consultationType ? { consultationType: filters.consultationType } : {}),
    },
    take: ROW_LIMIT + 1,
    orderBy: { createdAt: "desc" },
    select: {
      createdAt: true,
      fullName: true,
      email: true,
      consultationType: true,
      status: true,
      paymentStatus: true,
      scheduledAt: true,
      service: { select: { name: true } },
    },
  });
  const truncated = rows.length > ROW_LIMIT;
  const capped = truncated ? rows.slice(0, ROW_LIMIT) : rows;

  return {
    title: "Appointments",
    subtitle: `${doctorName} · ${rangeLabel(filters)}`,
    generatedAt: new Date().toISOString(),
    truncated,
    columns: [
      { key: "created", label: "Created" },
      { key: "patient", label: "Patient" },
      { key: "email", label: "Email" },
      { key: "type", label: "Type" },
      { key: "status", label: "Status" },
      { key: "payment", label: "Payment" },
      { key: "scheduled", label: "Scheduled" },
      { key: "service", label: "Service" },
    ],
    rows: capped.map((r) => ({
      created: fmtDate(r.createdAt),
      patient: r.fullName,
      email: r.email,
      type: r.consultationType,
      status: r.status,
      payment: r.paymentStatus,
      scheduled: fmtDateTime(r.scheduledAt),
      service: r.service?.name ?? "",
    })),
  };
}

// ── Doctor: monthly payout statement (consultations provided) ────────────────

/**
 * The consultations a doctor provided in the period, each valued at the
 * admin-set per-service payout (ServiceDoctor.doctorAmountCents) — NOT the
 * patient's gross price. Ends with a bold TOTAL row per currency. This is the
 * statement the doctor bases their own invoice on before uploading it.
 */
export async function doctorPayoutStatementReport(
  doctorId: string,
  doctorName: string,
  filters: ReportFilters,
): Promise<ReportTable> {
  const createdAt = rangeWhere(filters);
  const appts = await prisma.appointment.findMany({
    where: {
      doctorId,
      status: "COMPLETED",
      ...(createdAt ? { createdAt } : {}),
      ...(filters.consultationType ? { consultationType: filters.consultationType } : {}),
    },
    take: ROW_LIMIT + 1,
    orderBy: { createdAt: "asc" },
    select: {
      createdAt: true,
      scheduledAt: true,
      fullName: true,
      consultationType: true,
      serviceId: true,
      currencyCode: true,
      insuranceCompanyId: true,
      service: { select: { name: true, currencyCode: true } },
    },
  });
  const truncated = appts.length > ROW_LIMIT;
  const capped = truncated ? appts.slice(0, ROW_LIMIT) : appts;

  // Live payout lookup per (doctor, service). Appointments whose service has
  // no payout set show "Not set" and are excluded from the totals.
  const serviceIds = Array.from(
    new Set(capped.map((a) => a.serviceId).filter((id): id is string => !!id)),
  );
  const payoutByServiceId = new Map<string, number | null>();
  if (serviceIds.length > 0) {
    const payouts = await prisma.serviceDoctor.findMany({
      where: { doctorId, serviceId: { in: serviceIds } },
      select: { serviceId: true, doctorAmountCents: true },
    });
    for (const p of payouts) payoutByServiceId.set(p.serviceId, p.doctorAmountCents);
  }

  // Insurance bookings (appointment.insuranceCompanyId set) pay the SEPARATE
  // per-(company, service, doctor) insurance payout INSTEAD of the standard
  // per-service payout. No fallback: an unset insurance payout shows "Not set".
  const insuranceCompanyIds = Array.from(
    new Set(capped.map((a) => a.insuranceCompanyId).filter((id): id is string => !!id)),
  );
  const insurancePayoutByKey = new Map<string, number | null>();
  const companyNameById = new Map<string, string>();
  if (insuranceCompanyIds.length > 0) {
    const [insPayouts, companies] = await Promise.all([
      prisma.serviceDoctorInsurancePayout.findMany({
        where: { doctorId, insuranceCompanyId: { in: insuranceCompanyIds }, serviceId: { in: serviceIds } },
        select: { insuranceCompanyId: true, serviceId: true, doctorAmountCents: true },
      }),
      prisma.insuranceCompany.findMany({
        where: { id: { in: insuranceCompanyIds } },
        select: { id: true, name: true },
      }),
    ]);
    for (const p of insPayouts) {
      insurancePayoutByKey.set(`${p.insuranceCompanyId}:${p.serviceId}`, p.doctorAmountCents);
    }
    for (const c of companies) companyNameById.set(c.id, c.name);
  }

  const totals: Record<string, number> = {};
  const rows: ReportRow[] = capped.map((a) => {
    const isInsurance = Boolean(a.insuranceCompanyId);
    const payout = isInsurance
      ? a.serviceId
        ? insurancePayoutByKey.get(`${a.insuranceCompanyId}:${a.serviceId}`) ?? null
        : null
      : a.serviceId
        ? payoutByServiceId.get(a.serviceId) ?? null
        : null;
    const insurer = isInsurance ? companyNameById.get(a.insuranceCompanyId as string) ?? "Insurance" : "—";
    const currency = a.service?.currencyCode ?? a.currencyCode ?? "—";
    if (payout != null) totals[currency] = (totals[currency] ?? 0) + payout;
    return {
      date: fmtDate(a.scheduledAt ?? a.createdAt),
      patient: a.fullName,
      service: a.service?.name ?? "—",
      insurer,
      type: a.consultationType,
      payout: payout == null ? "Not set" : fmtMoney(payout, currency),
    };
  });

  // Bold total row(s) — one per currency present.
  for (const [currency, cents] of Object.entries(totals)) {
    rows.push({
      _total: true,
      date: "",
      patient: "",
      service: "",
      insurer: "",
      type: "TOTAL",
      payout: fmtMoney(cents, currency),
    });
  }

  return {
    title: "Payout statement",
    subtitle: `${doctorName} · ${rangeLabel(filters)} · ${capped.length} consultation${capped.length === 1 ? "" : "s"}`,
    generatedAt: new Date().toISOString(),
    truncated,
    columns: [
      { key: "date", label: "Date" },
      { key: "patient", label: "Patient" },
      { key: "service", label: "Service" },
      { key: "insurer", label: "Insurer" },
      { key: "type", label: "Type" },
      { key: "payout", label: "Payout", align: "right" },
    ],
    rows,
  };
}

// ── Admin: service assignments (all doctors) ─────────────────────────────────

export async function adminServicesReport(
  filters: ReportFilters,
): Promise<ReportTable> {
  const rows = await prisma.serviceDoctor.findMany({
    where: {
      ...(filters.doctorId ? { doctorId: filters.doctorId } : {}),
      ...(filters.countryCode
        ? { service: { country: { code: filters.countryCode } } }
        : {}),
    },
    take: ROW_LIMIT + 1,
    orderBy: [{ doctor: { fullName: "asc" } }, { service: { name: "asc" } }],
    select: {
      status: true,
      isActive: true,
      doctorAmountCents: true,
      doctor: { select: { fullName: true } },
      service: {
        select: {
          name: true,
          kind: true,
          basePriceCents: true,
          currencyCode: true,
          country: { select: { name: true } },
        },
      },
    },
  });
  const truncated = rows.length > ROW_LIMIT;
  const capped = truncated ? rows.slice(0, ROW_LIMIT) : rows;

  return {
    title: "Services by doctor",
    subtitle: filters.doctorId ? capped[0]?.doctor.fullName ?? "Doctor" : "All doctors",
    generatedAt: new Date().toISOString(),
    truncated,
    columns: [
      { key: "doctor", label: "Doctor" },
      { key: "service", label: "Service" },
      { key: "kind", label: "Type" },
      { key: "country", label: "Country" },
      { key: "basePrice", label: "Base price", align: "right" },
      { key: "payout", label: "Payout", align: "right" },
      { key: "status", label: "Assignment" },
      { key: "active", label: "Active" },
    ],
    rows: capped.map((r) => ({
      doctor: r.doctor.fullName,
      service: r.service.name,
      kind: r.service.kind,
      country: r.service.country.name,
      basePrice: fmtMoney(r.service.basePriceCents, r.service.currencyCode),
      payout: fmtMoney(r.doctorAmountCents, r.service.currencyCode),
      status: r.status,
      active: r.isActive ? "Yes" : "No",
    })),
  };
}

// ── Admin: patients (all) ────────────────────────────────────────────────────

export async function adminPatientsReport(
  _filters: ReportFilters,
): Promise<ReportTable> {
  const rows = await prisma.patientProfile.findMany({
    take: ROW_LIMIT + 1,
    orderBy: { createdAt: "desc" },
    select: {
      fullName: true,
      email: true,
      phone: true,
      dateOfBirth: true,
      createdAt: true,
    },
  });
  const truncated = rows.length > ROW_LIMIT;
  const capped = truncated ? rows.slice(0, ROW_LIMIT) : rows;

  return {
    title: "Patients",
    subtitle: "All registered patients",
    generatedAt: new Date().toISOString(),
    truncated,
    columns: [
      { key: "name", label: "Patient" },
      { key: "email", label: "Email" },
      { key: "phone", label: "Phone" },
      { key: "dob", label: "Date of birth" },
      { key: "registered", label: "Registered" },
    ],
    rows: capped.map((r) => ({
      name: r.fullName ?? "",
      email: r.email,
      phone: r.phone ?? "",
      dob: fmtDate(r.dateOfBirth),
      registered: fmtDate(r.createdAt),
    })),
  };
}

// ── Admin: appointments (all doctors) ────────────────────────────────────────

export async function adminAppointmentsReport(
  filters: ReportFilters,
): Promise<ReportTable> {
  const createdAt = rangeWhere(filters);
  const rows = await prisma.appointment.findMany({
    where: {
      ...(createdAt ? { createdAt } : {}),
      ...(filters.doctorId ? { doctorId: filters.doctorId } : {}),
      ...(filters.countryCode ? { countryCode: filters.countryCode } : {}),
      ...(filters.status ? { status: filters.status as never } : {}),
      ...(filters.paymentStatus ? { paymentStatus: filters.paymentStatus as never } : {}),
      ...(filters.consultationType ? { consultationType: filters.consultationType } : {}),
    },
    take: ROW_LIMIT + 1,
    orderBy: { createdAt: "desc" },
    select: {
      createdAt: true,
      countryCode: true,
      fullName: true,
      email: true,
      consultationType: true,
      status: true,
      paymentStatus: true,
      scheduledAt: true,
      doctor: { select: { fullName: true } },
      service: { select: { name: true } },
    },
  });
  const truncated = rows.length > ROW_LIMIT;
  const capped = truncated ? rows.slice(0, ROW_LIMIT) : rows;

  return {
    title: "Appointments",
    subtitle: `${filters.doctorId ? capped[0]?.doctor?.fullName ?? "Doctor" : "All doctors"} · ${rangeLabel(filters)}`,
    generatedAt: new Date().toISOString(),
    truncated,
    columns: [
      { key: "created", label: "Created" },
      { key: "country", label: "Country" },
      { key: "doctor", label: "Doctor" },
      { key: "patient", label: "Patient" },
      { key: "email", label: "Email" },
      { key: "type", label: "Type" },
      { key: "status", label: "Status" },
      { key: "payment", label: "Payment" },
      { key: "scheduled", label: "Scheduled" },
      { key: "service", label: "Service" },
    ],
    rows: capped.map((r) => ({
      created: fmtDate(r.createdAt),
      country: r.countryCode,
      doctor: r.doctor?.fullName ?? "",
      patient: r.fullName,
      email: r.email,
      type: r.consultationType,
      status: r.status,
      payment: r.paymentStatus,
      scheduled: fmtDateTime(r.scheduledAt),
      service: r.service?.name ?? "",
    })),
  };
}
