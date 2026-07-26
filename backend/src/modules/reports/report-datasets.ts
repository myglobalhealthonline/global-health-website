import { prisma } from "../../db/prisma.js";
import { normalizeIban } from "../../utils/iban.js";
import {
  fmtDate,
  fmtDateTime,
  fmtMoney,
  type ReportRow,
  type ReportSummaryItem,
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
    // No gross/base price here — a doctor's statement shows only what they are
    // paid. The patient-facing price stays on the admin report.
    columns: [
      { key: "service", label: "Service" },
      { key: "kind", label: "Type" },
      { key: "country", label: "Country" },
      { key: "payout", label: "Your payout", align: "right" },
      { key: "status", label: "Assignment" },
      { key: "active", label: "Active" },
    ],
    rows: capped.map((r) => ({
      service: r.service.name,
      kind: r.service.kind,
      country: r.service.country.name,
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
  // in memory — avoids groupBy losing the name column. Email is the dedup key
  // only; neither it nor the phone reaches a column.
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
    // No patient email/phone — the doctor's list reports carry no direct
    // contact details. Email is still folded on in memory (it is the dedup
    // key) but never becomes a column.
    columns: [
      { key: "name", label: "Patient" },
      { key: "country", label: "Country" },
      { key: "types", label: "Consultation types" },
      { key: "count", label: "Appointments", align: "right" },
      { key: "last", label: "Last appointment" },
    ],
    rows: patients.map((p) => ({
      name: p.fullName,
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
      { key: "type", label: "Type" },
      { key: "status", label: "Status" },
      { key: "payment", label: "Payment" },
      { key: "scheduled", label: "Scheduled" },
      { key: "service", label: "Service" },
    ],
    rows: capped.map((r) => ({
      created: fmtDate(r.createdAt),
      patient: r.fullName,
      type: r.consultationType,
      status: r.status,
      payment: r.paymentStatus,
      scheduled: fmtDateTime(r.scheduledAt),
      service: r.service?.name ?? "",
    })),
  };
}

// ── Doctor: monthly payout statement (consultations provided) ────────────────

/** Doctor payout bank details rendered in the statement header. The full IBAN
 *  is decrypted + (for admin pulls) audited by the ROUTE, never here. */
export type PayoutBankInfo = {
  accountHolder?: string | null;
  /** Full, already-decrypted IBAN. Null when none is on file. */
  iban?: string | null;
  bic?: string | null;
};

/** Group a normalised IBAN into 4-char blocks for legibility on the statement. */
function groupIban(iban: string): string {
  return normalizeIban(iban).replace(/(.{4})/g, "$1 ").trim();
}

/**
 * The consultations a doctor provided in the period, each valued at the
 * admin-set per-service payout (ServiceDoctor.doctorAmountCents) — NOT the
 * patient's gross price.
 *
 * Keyed on the CONSULTATION date (`scheduledAt`), not `createdAt`: a call held
 * on the 19th belongs in that week's statement even if it was booked weeks
 * earlier. Appointments never scheduled (no `scheduledAt`) carry no
 * consultation date and are out of scope for a period payout.
 *
 * When the doctor served more than one market the rows are split into a
 * section per market, each with its own subtotal, followed by a grand
 * "TOTAL TO PAY". The header block carries the payout bank details so finance
 * can process the transfer straight from the statement.
 */
export async function doctorPayoutStatementReport(
  doctorId: string,
  doctorName: string,
  filters: ReportFilters,
  bank?: PayoutBankInfo,
): Promise<ReportTable> {
  // Hard floor: never pay for consultations dated before go-live (17 Jul 2026).
  // Everything earlier is legacy-import noise (e.g. `legacy-records` rows), so it
  // is excluded even when the caller's From date reaches further back.
  const PAYOUT_MIN_DATE = new Date(Date.UTC(2026, 6, 17, 0, 0, 0, 0));
  const from =
    filters.from && filters.from > PAYOUT_MIN_DATE ? filters.from : PAYOUT_MIN_DATE;
  const to = filters.to;
  const dateRange = { gte: from, ...(to ? { lte: to } : {}) };
  const periodLabel = `${fmtDate(from)} → ${to ? fmtDate(to) : "—"}`;

  const appts = await prisma.appointment.findMany({
    where: {
      doctorId,
      ...(filters.countryCode ? { countryCode: filters.countryCode } : {}),
      ...(filters.consultationType ? { consultationType: filters.consultationType } : {}),
      // Never pay for a refunded consultation — the money went back to the
      // patient, so it drops off the payout regardless of everything else.
      paymentStatus: { not: "REFUNDED" },
      AND: [
        // Payable when the patient PAID, OR the consultation was delivered
        // (explicit COMPLETED status, or a set `consultationCompletedAt` — some
        // concluded consultations, e.g. legacy/finalize flows, keep a
        // REQUEST_RECEIVED status while their completed-timestamp is set, and an
        // insurance consultation is delivered without the patient ever paying).
        {
          OR: [
            { paymentStatus: "PAID" },
            { status: "COMPLETED" },
            { consultationCompletedAt: { not: null } },
          ],
        },
        // Consultation date = scheduledAt, else consultationCompletedAt, else
        // createdAt — a COALESCE expressed as a filter so a call with no
        // scheduledAt still lands in the right period.
        {
          OR: [
            { scheduledAt: dateRange },
            { scheduledAt: null, consultationCompletedAt: dateRange },
            { scheduledAt: null, consultationCompletedAt: null, createdAt: dateRange },
          ],
        },
      ],
    },
    take: ROW_LIMIT + 1,
    orderBy: [{ countryCode: "asc" }, { scheduledAt: "asc" }],
    select: {
      id: true,
      createdAt: true,
      scheduledAt: true,
      consultationCompletedAt: true,
      countryCode: true,
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

  // Cross-border async consults carry no catalogue service — their payout was
  // snapshotted on the CrossBorderPrescriptionRequest at request time. Look
  // those up so the statement values them (otherwise they'd read "Not set").
  const crossBorderApptIds = capped
    .filter((a) => a.consultationType === "cross-border-prescription")
    .map((a) => a.id);
  const crossBorderPayoutByApptId = new Map<string, number | null>();
  if (crossBorderApptIds.length > 0) {
    const reqs = await prisma.crossBorderPrescriptionRequest.findMany({
      where: { asyncAppointmentId: { in: crossBorderApptIds } },
      select: { asyncAppointmentId: true, payoutCents: true },
    });
    for (const r of reqs) {
      if (r.asyncAppointmentId) {
        crossBorderPayoutByApptId.set(r.asyncAppointmentId, r.payoutCents);
      }
    }
  }

  // Effective consultation date, matching the COALESCE filter above.
  const effDate = (a: (typeof capped)[number]): Date =>
    a.scheduledAt ?? a.consultationCompletedAt ?? a.createdAt;

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

  // Market (Appointment.countryCode) → display name. The codes are stored
  // lower-case; the Country table is small, so load it once and match
  // case-insensitively rather than round-trip per code.
  const countryNameByCode = new Map<string, string>();
  if (capped.length > 0) {
    const countries = await prisma.country.findMany({ select: { code: true, name: true } });
    for (const c of countries) countryNameByCode.set(c.code.toLowerCase(), c.name);
  }
  const marketLabel = (code: string): string =>
    countryNameByCode.get(code.toLowerCase()) ?? code.toUpperCase();

  // Group appointments by market, preserving first-seen order.
  const byMarket = new Map<string, typeof capped>();
  for (const a of capped) {
    const key = a.countryCode.toLowerCase();
    let list = byMarket.get(key);
    if (!list) {
      list = [];
      byMarket.set(key, list);
    }
    list.push(a);
  }
  const marketKeys = Array.from(byMarket.keys()).sort((x, y) =>
    marketLabel(x).localeCompare(marketLabel(y)),
  );
  const multiMarket = marketKeys.length > 1;

  const payoutOf = (a: (typeof capped)[number]) => {
    // Cross-border async consult: payout snapshotted on the request; no service.
    if (a.consultationType === "cross-border-prescription") {
      return {
        payout: crossBorderPayoutByApptId.get(a.id) ?? null,
        insurer: "—",
        currency: a.currencyCode ?? "—",
      };
    }
    const isInsurance = Boolean(a.insuranceCompanyId);
    const payout = isInsurance
      ? a.serviceId
        ? insurancePayoutByKey.get(`${a.insuranceCompanyId}:${a.serviceId}`) ?? null
        : null
      : a.serviceId
        ? payoutByServiceId.get(a.serviceId) ?? null
        : null;
    const insurer = isInsurance
      ? companyNameById.get(a.insuranceCompanyId as string) ?? "Insurance"
      : "—";
    const currency = a.service?.currencyCode ?? a.currencyCode ?? "—";
    return { payout, insurer, currency };
  };

  const grand: Record<string, number> = {};
  const rows: ReportRow[] = [];
  for (const key of marketKeys) {
    const list = byMarket.get(key)!;
    list.sort((x, y) => effDate(x).getTime() - effDate(y).getTime());
    if (multiMarket) rows.push({ _section: `Market — ${marketLabel(key)}` });
    const subtotal: Record<string, number> = {};
    for (const a of list) {
      const { payout, insurer, currency } = payoutOf(a);
      if (payout != null) {
        subtotal[currency] = (subtotal[currency] ?? 0) + payout;
        grand[currency] = (grand[currency] ?? 0) + payout;
      }
      rows.push({
        date: fmtDate(effDate(a)),
        patient: a.fullName,
        service: a.service?.name ?? "—",
        insurer,
        payout: payout == null ? "Not set" : fmtMoney(payout, currency),
      });
    }
    if (multiMarket) {
      for (const [currency, cents] of Object.entries(subtotal)) {
        rows.push({
          _total: true,
          date: "",
          patient: "",
          service: `Subtotal — ${marketLabel(key)}`,
          insurer: "",
          payout: fmtMoney(cents, currency),
        });
      }
    }
  }

  // Grand total row(s) — one per currency present.
  for (const [currency, cents] of Object.entries(grand)) {
    rows.push({
      _total: true,
      date: "",
      patient: "",
      service: "TOTAL TO PAY",
      insurer: "",
      payout: fmtMoney(cents, currency),
    });
  }

  const totalToPay =
    Object.entries(grand)
      .map(([currency, cents]) => fmtMoney(cents, currency))
      .join(" · ") || "—";

  const summary: ReportSummaryItem[] = [
    { label: "Period", value: periodLabel },
    { label: "Account holder", value: bank?.accountHolder?.trim() || doctorName },
    {
      label: "IBAN",
      value: bank?.iban?.trim() ? groupIban(bank.iban) : "Not on file",
    },
    ...(bank?.bic?.trim() ? [{ label: "BIC / SWIFT", value: bank.bic.trim() }] : []),
    ...(multiMarket
      ? [{ label: "Markets", value: marketKeys.map(marketLabel).join(", ") }]
      : []),
    { label: "Total to pay", value: totalToPay },
  ];

  return {
    title: "Payout statement",
    subtitle: `${doctorName} · ${periodLabel} · ${capped.length} consultation${capped.length === 1 ? "" : "s"}`,
    summary,
    generatedAt: new Date().toISOString(),
    truncated,
    // No patient/gross price column — a payout statement shows only what the
    // doctor is paid (standard per-service payout, or the insurance payout for
    // insured bookings). The patient-facing price lives on the admin reports.
    // No consultation-type column either — the Service names the consultation.
    columns: [
      { key: "date", label: "Date" },
      { key: "patient", label: "Patient" },
      { key: "service", label: "Service" },
      { key: "insurer", label: "Insurer" },
      { key: "payout", label: "Payout", align: "right" },
    ],
    rows,
  };
}

// ── Admin: service assignments (all doctors) ─────────────────────────────────

export async function adminServicesReport(
  filters: ReportFilters,
): Promise<ReportTable> {
  // Optional From/To narrows to assignments CREATED in the window
  // (ServiceDoctor.createdAt) — i.e. doctors newly assigned to a service in
  // that period. The "Assigned" column spells the date out so the filter's
  // meaning is visible on the report itself.
  const createdAt = rangeWhere(filters);
  const rows = await prisma.serviceDoctor.findMany({
    where: {
      ...(filters.doctorId ? { doctorId: filters.doctorId } : {}),
      ...(filters.countryCode
        ? { service: { country: { code: filters.countryCode } } }
        : {}),
      ...(createdAt ? { createdAt } : {}),
    },
    take: ROW_LIMIT + 1,
    orderBy: [{ doctor: { fullName: "asc" } }, { service: { name: "asc" } }],
    select: {
      status: true,
      isActive: true,
      doctorAmountCents: true,
      createdAt: true,
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
    subtitle: [
      filters.doctorId ? capped[0]?.doctor.fullName ?? "Doctor" : "All doctors",
      ...(createdAt ? [rangeLabel(filters)] : []),
    ].join(" · "),
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
      { key: "assigned", label: "Assigned" },
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
      assigned: fmtDate(r.createdAt),
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
    // Patient email is deliberately NOT a column — it is still selected above
    // because it is the only join key to the appointment facts, but it never
    // leaves this function. No report, doctor or admin, prints patient email.
    columns: [
      { key: "name", label: "Patient" },
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
      type: r.consultationType,
      status: r.status,
      payment: r.paymentStatus,
      scheduled: fmtDateTime(r.scheduledAt),
      service: r.service?.name ?? "",
    })),
  };
}
