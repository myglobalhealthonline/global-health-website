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
  /** Admin-only narrowing — a doctor's own reports are already self-scoped. */
  doctorId?: string;
  /** Market the appointment was booked in (`Appointment.countryCode`). */
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

/** The country / consultation-type narrowing applied, spelled out for the
 *  report subtitle so a downloaded file always states its own scope. */
function scopeLabels(filters: ReportFilters, doctorName?: string): string[] {
  const parts: string[] = [];
  if (filters.countryCode) parts.push(`country ${filters.countryCode.toUpperCase()}`);
  if (doctorName) parts.push(doctorName);
  if (filters.consultationType) parts.push(`${filters.consultationType} consultations`);
  return parts;
}

/**
 * Distinct country / doctor / consultation-type facts folded per patient email.
 *
 * `PatientProfile` carries none of those three — they live on `Appointment`,
 * and the ONLY link between the two tables is the email string (there is no
 * FK). Grouping by the four columns keeps this bounded to distinct
 * combinations rather than one row per appointment.
 */
type PatientApptFacts = {
  countries: Set<string>;
  doctorNames: Set<string>;
  types: Set<string>;
  count: number;
  last: Date | null;
};

type AppointmentScope = {
  createdAt?: { gte?: Date; lte?: Date };
  countryCode?: string;
  doctorId?: string;
  consultationType?: string;
  email?: { in: string[] };
};

/** Both spellings of every address — see `emailVariants` below. */
function emailVariants(emails: string[]): string[] {
  const out = new Set<string>();
  for (const e of emails) {
    out.add(e);
    out.add(e.toLowerCase());
  }
  return Array.from(out);
}

async function patientApptFacts(scope: AppointmentScope): Promise<{
  byEmail: Map<string, PatientApptFacts>;
  /** Raw + lower-cased spellings, for an `email: { in: … }` profile lookup —
   *  `Appointment.email` is free text while `PatientProfile.email` is the
   *  unique key, and Postgres `IN` is case-sensitive. */
  emailVariants: string[];
  doctorNameById: Map<string, string>;
  truncated: boolean;
}> {
  const groups = await prisma.appointment.groupBy({
    by: ["email", "countryCode", "consultationType", "doctorId"],
    where: scope,
    _count: { _all: true },
    _max: { createdAt: true },
    orderBy: { email: "asc" },
    take: ROW_LIMIT + 1,
  });
  const truncated = groups.length > ROW_LIMIT;
  const capped = truncated ? groups.slice(0, ROW_LIMIT) : groups;

  const doctorIds = Array.from(
    new Set(capped.map((g) => g.doctorId).filter((id): id is string => !!id)),
  );
  const doctorNameById = new Map<string, string>();
  if (doctorIds.length > 0) {
    const doctors = await prisma.doctor.findMany({
      where: { id: { in: doctorIds } },
      select: { id: true, fullName: true },
    });
    for (const d of doctors) doctorNameById.set(d.id, d.fullName);
  }

  const byEmail = new Map<string, PatientApptFacts>();
  const seenEmails = new Set<string>();
  for (const g of capped) {
    seenEmails.add(g.email);
    const key = g.email.toLowerCase();
    let facts = byEmail.get(key);
    if (!facts) {
      facts = {
        countries: new Set(),
        doctorNames: new Set(),
        types: new Set(),
        count: 0,
        last: null,
      };
      byEmail.set(key, facts);
    }
    facts.countries.add(g.countryCode.toUpperCase());
    facts.types.add(g.consultationType);
    if (g.doctorId) facts.doctorNames.add(doctorNameById.get(g.doctorId) ?? "—");
    facts.count += g._count._all;
    const last = g._max.createdAt;
    if (last && (!facts.last || last > facts.last)) facts.last = last;
  }

  return {
    byEmail,
    emailVariants: emailVariants(Array.from(seenEmails)),
    doctorNameById,
    truncated,
  };
}

/** Sorted, comma-joined set — the cell format for the multi-valued
 *  country / doctor / type columns. */
function joinSet(values: Set<string> | undefined): string {
  return values ? Array.from(values).sort().join(", ") : "";
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
      ...(filters.countryCode ? { countryCode: filters.countryCode } : {}),
      ...(filters.consultationType ? { consultationType: filters.consultationType } : {}),
    },
    take: ROW_LIMIT + 1,
    orderBy: { createdAt: "desc" },
    select: {
      fullName: true,
      email: true,
      phone: true,
      countryCode: true,
      consultationType: true,
      createdAt: true,
    },
  });
  const truncated = appts.length > ROW_LIMIT;
  const capped = truncated ? appts.slice(0, ROW_LIMIT) : appts;

  const byEmail = new Map<
    string,
    {
      fullName: string;
      email: string;
      phone: string | null;
      countries: Set<string>;
      types: Set<string>;
      count: number;
      last: Date;
    }
  >();
  for (const a of capped) {
    const key = a.email.toLowerCase();
    const existing = byEmail.get(key);
    if (existing) {
      existing.count += 1;
      existing.countries.add(a.countryCode.toUpperCase());
      existing.types.add(a.consultationType);
      if (a.createdAt > existing.last) existing.last = a.createdAt;
    } else {
      byEmail.set(key, {
        fullName: a.fullName,
        email: a.email,
        phone: a.phone,
        countries: new Set([a.countryCode.toUpperCase()]),
        types: new Set([a.consultationType]),
        count: 1,
        last: a.createdAt,
      });
    }
  }
  const patients = Array.from(byEmail.values()).sort((a, b) =>
    a.fullName.localeCompare(b.fullName),
  );

  const scope = scopeLabels(filters);

  return {
    title: "Patients",
    subtitle: [doctorName, rangeLabel(filters), ...scope].join(" · "),
    generatedAt: new Date().toISOString(),
    truncated,
    columns: [
      { key: "name", label: "Patient" },
      { key: "email", label: "Email" },
      { key: "phone", label: "Phone" },
      { key: "country", label: "Country" },
      { key: "types", label: "Consultation types" },
      { key: "count", label: "Appointments", align: "right" },
      { key: "last", label: "Last appointment" },
    ],
    rows: patients.map((p) => ({
      name: p.fullName,
      email: p.email,
      phone: p.phone ?? "",
      country: joinSet(p.countries),
      types: joinSet(p.types),
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

/**
 * The registered patient roster, enriched with the country / doctor /
 * consultation-type facts pulled from each patient's appointments.
 *
 * Unfiltered it stays the FULL roster — including patients who have never
 * booked, whose appointment-derived columns are simply blank. Any of the
 * country / doctor / consultationType / date filters narrows it to the
 * profiles behind the matching appointments.
 *
 * Two distinct country notions, deliberately kept as separate columns:
 *   • "Country"  — `PatientProfile.addressCountryCode`, the patient's own
 *                  home address. Optional, so often blank.
 *   • "Markets"  — `Appointment.countryCode`, the market(s) they booked in.
 *                  This is what the `countryCode` filter matches.
 */
export async function adminPatientsReport(
  filters: ReportFilters,
): Promise<ReportTable> {
  const createdAt = rangeWhere(filters);
  const narrowed = Boolean(
    filters.countryCode || filters.doctorId || filters.consultationType || createdAt,
  );

  const profileSelect = {
    fullName: true,
    email: true,
    phone: true,
    dateOfBirth: true,
    addressCountryCode: true,
    createdAt: true,
  } as const;

  // Order matters: the roster and the facts are each capped at ROW_LIMIT, so
  // deriving one from the other keeps the two windows aligned. Querying both
  // independently would let the roster (newest-first) and the facts
  // (email-ordered) cover different patients — every row outside the overlap
  // would silently render blank country / doctor / type cells.
  let facts: Awaited<ReturnType<typeof patientApptFacts>>;
  let rows: Array<{
    fullName: string | null;
    email: string;
    phone: string | null;
    dateOfBirth: Date | null;
    addressCountryCode: string | null;
    createdAt: Date;
  }>;

  if (narrowed) {
    // Filtered: the appointments decide who is on the list.
    facts = await patientApptFacts({
      ...(createdAt ? { createdAt } : {}),
      ...(filters.countryCode ? { countryCode: filters.countryCode } : {}),
      ...(filters.doctorId ? { doctorId: filters.doctorId } : {}),
      ...(filters.consultationType ? { consultationType: filters.consultationType } : {}),
    });
    rows = await prisma.patientProfile.findMany({
      where: { email: { in: facts.emailVariants } },
      take: ROW_LIMIT + 1,
      orderBy: { createdAt: "desc" },
      select: profileSelect,
    });
  } else {
    // Unfiltered: the full roster decides, and the facts are looked up only
    // for the patients actually being exported.
    rows = await prisma.patientProfile.findMany({
      take: ROW_LIMIT + 1,
      orderBy: { createdAt: "desc" },
      select: profileSelect,
    });
    facts = await patientApptFacts({
      email: { in: emailVariants(rows.slice(0, ROW_LIMIT).map((r) => r.email)) },
    });
  }

  const rosterTruncated = rows.length > ROW_LIMIT;
  const capped = rosterTruncated ? rows.slice(0, ROW_LIMIT) : rows;

  const doctorName = filters.doctorId
    ? facts.doctorNameById.get(filters.doctorId) ?? "selected doctor"
    : undefined;
  const scope = [
    ...scopeLabels(filters, doctorName),
    ...(createdAt ? [rangeLabel(filters)] : []),
  ];

  return {
    title: "Patients",
    subtitle: scope.length === 0 ? "All registered patients" : scope.join(" · "),
    generatedAt: new Date().toISOString(),
    truncated: rosterTruncated || facts.truncated,
    columns: [
      { key: "name", label: "Patient" },
      { key: "email", label: "Email" },
      { key: "phone", label: "Phone" },
      { key: "country", label: "Country" },
      { key: "markets", label: "Markets" },
      { key: "doctors", label: "Doctors" },
      { key: "types", label: "Consultation types" },
      { key: "appointments", label: "Appointments", align: "right" },
      { key: "last", label: "Last appointment" },
      { key: "dob", label: "Date of birth" },
      { key: "registered", label: "Registered" },
    ],
    rows: capped.map((r) => {
      const f = facts.byEmail.get(r.email.toLowerCase());
      return {
        name: r.fullName ?? "",
        email: r.email,
        phone: r.phone ?? "",
        country: r.addressCountryCode ?? "",
        markets: joinSet(f?.countries),
        doctors: joinSet(f?.doctorNames),
        types: joinSet(f?.types),
        appointments: f?.count ?? 0,
        last: fmtDate(f?.last),
        dob: fmtDate(r.dateOfBirth),
        registered: fmtDate(r.createdAt),
      };
    }),
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
