import { prisma } from "../../db/prisma.js";
import {
  fmtDate,
  fmtMoney,
  type ReportRow,
  type ReportSummaryItem,
  type ReportTable,
} from "./report-formatters.js";
import type { ReportFilters } from "./report-datasets.js";
import {
  clinicalDirectorCommission,
  type ClinicalDirectorTerms,
} from "./clinical-director-terms.js";

export {
  CLINICAL_DIRECTOR_TERMS,
  clinicalDirectorCommission,
  type ClinicalDirectorTerms,
} from "./clinical-director-terms.js";

/** Same cap as the other exports — protects the DB and the response size. */
const ROW_LIMIT = 10_000;

/**
 * The clinical director this market's statement is addressed to, with the
 * account it is paid into. The IBAN is decrypted (and the reveal audited) by
 * the ROUTE, never here — same contract as the doctor payout statement.
 */
export type ClinicalDirectorPayee = {
  fullName: string;
  accountHolder?: string | null;
  /** Full, already-decrypted IBAN. Null when none is on file. */
  iban?: string | null;
  bic?: string | null;
};

/**
 * Who holds the directorship for a market: the master switch on the doctor
 * AND the per-market grant must both be set, matching how director access is
 * checked everywhere else. Null when the market has no director on file.
 */
export async function findClinicalDirector(
  countryCode: string,
): Promise<{ id: string; fullName: string } | null> {
  const row = await prisma.doctorCountry.findFirst({
    where: {
      directorAccess: true,
      doctor: { isCountryDirector: true },
      country: { code: { equals: countryCode, mode: "insensitive" } },
    },
    select: { doctor: { select: { id: true, fullName: true } } },
  });
  return row?.doctor ?? null;
}

/** Group a normalised IBAN into 4-char blocks, as the payout statement does. */
function groupIban(iban: string): string {
  return iban.replace(/[\s-]/g, "").toUpperCase().replace(/(.{4})/g, "$1 ").trim();
}

function rangeText(filters: ReportFilters): string {
  const from = filters.from ? fmtDate(filters.from) : "—";
  const to = filters.to ? fmtDate(filters.to) : "—";
  return `${from} → ${to}`;
}

/**
 * Every consultation invoiced in one director's market over a period, with the
 * amount the PATIENT paid, followed by the director's commission.
 *
 * Keyed on what was INVOICED, not on what a doctor finalised: the agreement is
 * a share of money taken in the market, so a consultation the doctor never got
 * round to finalising still counts toward it. Cancelled and refunded bookings
 * are excluded, since no money was kept.
 */
export async function clinicalDirectorStatementReport(
  terms: ClinicalDirectorTerms,
  filters: ReportFilters,
  director?: ClinicalDirectorPayee | null,
): Promise<ReportTable> {
  const { from, to } = filters;
  const dateRange =
    from || to ? { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } : undefined;

  const appts = await prisma.appointment.findMany({
    where: {
      countryCode: { equals: terms.countryCode, mode: "insensitive" },
      status: { not: "CANCELLED" },
      paymentStatus: "PAID",
      ...(filters.doctorId ? { doctorId: filters.doctorId } : {}),
      ...(filters.consultationType ? { consultationType: filters.consultationType } : {}),
      ...(dateRange
        ? {
            OR: [
              { scheduledAt: dateRange },
              { scheduledAt: null, consultationCompletedAt: dateRange },
              { scheduledAt: null, consultationCompletedAt: null, createdAt: dateRange },
            ],
          }
        : {}),
    },
    take: ROW_LIMIT + 1,
    select: {
      id: true,
      fullName: true,
      scheduledAt: true,
      consultationCompletedAt: true,
      createdAt: true,
      consultationType: true,
      doctor: { select: { fullName: true } },
      service: { select: { name: true } },
    },
  });
  const truncated = appts.length > ROW_LIMIT;
  const capped = truncated ? appts.slice(0, ROW_LIMIT) : appts;
  const effDate = (a: (typeof capped)[number]) =>
    a.scheduledAt ?? a.consultationCompletedAt ?? a.createdAt;

  // The patient-facing amount lives on the order line, which also carries the
  // human order reference finance quotes.
  const items = await prisma.orderItem.findMany({
    where: { appointmentId: { in: capped.map((a) => a.id) } },
    select: {
      appointmentId: true,
      lineTotalCents: true,
      order: { select: { orderNumber: true, currencyCode: true } },
    },
  });
  const itemBy = new Map(items.map((i) => [i.appointmentId as string, i]));

  const rows: ReportRow[] = [];
  const grossByCurrency: Record<string, number> = {};
  let unpriced = 0;

  for (const a of [...capped].sort((x, y) => effDate(x).getTime() - effDate(y).getTime())) {
    const item = itemBy.get(a.id);
    const currency = (item?.order.currencyCode ?? terms.currencyCode).toUpperCase();
    if (item) grossByCurrency[currency] = (grossByCurrency[currency] ?? 0) + item.lineTotalCents;
    else unpriced += 1;

    rows.push({
      order: item?.order.orderNumber ?? "—",
      date: fmtDate(effDate(a)),
      patient: a.fullName,
      doctor: a.doctor?.fullName ?? "—",
      consultation: a.service?.name ?? a.consultationType ?? "—",
      amount: item ? fmtMoney(item.lineTotalCents, currency) : "—",
    });
  }

  const gross = grossByCurrency[terms.currencyCode] ?? 0;
  const fee = clinicalDirectorCommission(gross, terms);
  const pct = (r: number) => `${(r * 100).toFixed(0)}%`;
  const threshold = fmtMoney(terms.thresholdCents, terms.currencyCode);

  const totalRow = (label: string, value: string): ReportRow => ({
    _total: true,
    order: "",
    date: "",
    patient: "",
    doctor: "",
    consultation: label,
    amount: value,
  });

  // Any other currency is reported but never converted — the agreement names
  // one currency, and inventing a rate here would invent the commission too.
  for (const [code, cents] of Object.entries(grossByCurrency)) {
    if (code === terms.currencyCode) continue;
    rows.push(
      totalRow(`Invoiced in ${code} — outside the agreement, not commissioned`, fmtMoney(cents, code)),
    );
  }

  rows.push(totalRow("TOTAL INVOICED", fmtMoney(gross, terms.currencyCode)));
  rows.push(
    totalRow(`Commission — first ${threshold} at ${pct(terms.topRate)}`, fmtMoney(fee.topFee, terms.currencyCode)),
  );
  rows.push(
    totalRow(`Commission — above ${threshold} at ${pct(terms.aboveRate)}`, fmtMoney(fee.aboveFee, terms.currencyCode)),
  );
  rows.push(totalRow("DIRECTOR COMMISSION", fmtMoney(fee.total, terms.currencyCode)));

  const summary: ReportSummaryItem[] = [
    // Who is being paid, for which market, and into what — finance runs the
    // transfer straight off this statement, exactly as with a doctor payout.
    { label: "Clinical director", value: director?.fullName ?? "Not on file" },
    { label: "Market", value: terms.marketLabel },
    ...(director
      ? [
          {
            label: "Account holder",
            value: director.accountHolder?.trim() || director.fullName,
          },
          {
            label: "IBAN",
            value: director.iban?.trim() ? groupIban(director.iban) : "Not on file",
          },
          ...(director.bic?.trim() ? [{ label: "BIC / SWIFT", value: director.bic.trim() }] : []),
        ]
      : []),
    { label: "Period", value: rangeText(filters) },
    { label: "Consultations", value: String(capped.length) },
    { label: "Total invoiced", value: fmtMoney(gross, terms.currencyCode) },
    {
      label: "Commission bands",
      value: `${pct(terms.topRate)} to ${threshold} · ${pct(terms.aboveRate)} above`,
    },
    { label: "Director commission", value: fmtMoney(fee.total, terms.currencyCode) },
    ...(unpriced > 0
      ? [
          {
            label: "No order line",
            value: `${unpriced} consultation(s) carry no amount — excluded from the total`,
          },
        ]
      : []),
  ];

  return {
    title: `Clinical director statement — ${terms.marketLabel}`,
    subtitle: `${director ? `${director.fullName} · ` : ""}${rangeText(filters)} · ${capped.length} consultations`,
    summary,
    generatedAt: new Date().toISOString(),
    truncated,
    columns: [
      { key: "order", label: "Order" },
      { key: "date", label: "Date" },
      { key: "patient", label: "Patient" },
      { key: "doctor", label: "Doctor" },
      { key: "consultation", label: "Consultation" },
      { key: "amount", label: "Amount paid", align: "right" },
    ],
    rows,
  };
}
