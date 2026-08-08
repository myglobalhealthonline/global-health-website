import type { MembershipBenefitType, MembershipEnrollmentStatus } from "@prisma/client";
import { prisma } from "../../db/prisma.js";

/**
 * Membership reporting (§15/§32) — per-plan usage and the per-member
 * drill-down behind it.
 *
 * **The primary source is `OrderItem.membershipEnrollmentId`, not the ledger.**
 * Only ALLOWANCE spends ever write a ledger row, so a ledger-driven report
 * would silently omit every PERCENT and FIXED booking — the majority of member
 * activity. The ledger is used for exactly one thing: allowance units used
 * against allocated.
 *
 * **`membershipOverrideReason IS NOT NULL` is the whole override predicate**
 * (§11.7). It is the sole discriminator between goodwill and real usage —
 * never the presence or absence of an enrollment id, which is stamped for an
 * override too whenever the patient holds an enrollment at all. Overrides are
 * kept out of the partner's usage totals, out of "total discount given" and out
 * of allowance-used, because goodwill is our cost rather than their
 * consumption — and reported on their own line with their reasons, because a
 * number appearing in neither category is a number nobody reviews.
 *
 * Booking metadata only: date, service, doctor, price, benefit, order number.
 * No clinical content ever reaches this module.
 */

export type MembershipUsageFilters = {
  planId: string;
  from?: Date | null;
  to?: Date | null;
};

export type MembershipUsageRow = {
  orderItemId: string;
  orderId: string;
  orderNumber: string;
  bookedAt: Date;
  serviceName: string;
  doctorName: string | null;
  /** What the line would have cost without the benefit. */
  listPriceCents: number;
  pricePaidCents: number;
  discountCents: number;
  benefitType: MembershipBenefitType | null;
  allowanceUsed: boolean;
  /** Non-null only for a goodwill override — and then it is the reason. */
  overrideReason: string | null;
  memberName: string | null;
  membershipId: string | null;
  enrollmentId: string | null;
  /**
   * Where the booking happened — `Order.countryCode` (§23). Under a
   * multi-country plan this is NOT the member's own (reporting) country: a
   * member enrolled on a Czech-primary plan booking in Ireland produces an
   * Irish row. That is the whole point of the per-country split, and it is what
   * the CSV's `country` column carries.
   */
  countryCode: string | null;
};

/**
 * One country's slice of a plan's usage (§23, phase 7f).
 *
 * `currencyCode` lives HERE and not on the report, because a multi-country plan
 * has no single currency and there is no conversion anywhere (§39). Two sections
 * are never added together, and there is deliberately no headline figure.
 */
export type MembershipUsageCountrySection = {
  /** ISO-2, from `Order.countryCode` — a plain column, no join needed. */
  countryCode: string;
  /**
   * Null only for a covered country with no bookings in the range. Every
   * section built from real order data has one, since `Order.currencyCode` is
   * not nullable.
   */
  currencyCode: string | null;
  /** True for a covered country the plan still lists — `false` means the rows
   *  predate its removal, and §26 promises those bookings keep their price. */
  covered: boolean;
  /** Real member usage in the range, excluding overrides. */
  usage: {
    consultations: number;
    byBenefitType: Record<MembershipBenefitType, number>;
    totalDiscountCents: number;
    totalChargedCents: number;
    rows: MembershipUsageRow[];
  };
  /** Goodwill, on its own line per country and out of every total above (§15). */
  overrides: {
    consultations: number;
    totalValueCents: number;
    rows: MembershipUsageRow[];
  };
};

export type MembershipUsageReport = {
  /** `countryCode` here is the plan's PRIMARY country — its identity, not a
   *  usage dimension. Usage is split across `countries` below. */
  plan: { id: string; name: string; slug: string; countryCode: string };
  range: { from: Date | null; to: Date | null };
  /**
   * GLOBAL, not per country (§23). Enrollment is pinned to the plan's primary
   * country by the §21.5 composite FK, so splitting this would invent a
   * distinction the data model does not have.
   */
  membersByStatus: Record<MembershipEnrollmentStatus, number>;
  /** GLOBAL, and deliberately: the pool is shared across every country (§36). */
  allowance: { allocated: number; used: number };
  /**
   * The UNION of two sets: countries present in the order data, plus covered
   * countries with no bookings (shown as zero). Covered-only would make a
   * removed country's rows vanish; data-only would hide that a covered market
   * is being used by nobody, which is exactly what a partner conversation
   * needs. Primary first, then alphabetical.
   */
  countries: MembershipUsageCountrySection[];
};

const EMPTY_STATUS_COUNTS: Record<MembershipEnrollmentStatus, number> = {
  PENDING: 0,
  ACTIVE: 0,
  SUSPENDED: 0,
  EXPIRED: 0,
  REMOVED: 0,
};

const EMPTY_TYPE_COUNTS: Record<MembershipBenefitType, number> = {
  ALLOWANCE: 0,
  PERCENT: 0,
  FIXED: 0,
  EXCLUDED: 0,
};

/**
 * The OrderItem shape both reports read. Booking metadata only.
 *
 * `doctorId` and `membershipEnrollmentId` are plain columns — `OrderItem` has
 * no relation for either (the membership columns are an audit trail, mirroring
 * `corporateCompanyId`) — so their names are resolved in a second query and
 * joined here rather than through `include`.
 */
const usageItemSelect = {
  id: true,
  orderId: true,
  name: true,
  unitPriceCents: true,
  doctorId: true,
  membershipEnrollmentId: true,
  membershipBenefitId: true,
  membershipDiscountCents: true,
  membershipAllowanceUsed: true,
  membershipOverrideReason: true,
  // `countryCode` and `currencyCode` are plain columns on `Order` (§23), so the
  // per-country split needs no join and no country table lookup.
  order: {
    select: {
      orderNumber: true,
      createdAt: true,
      currencyCode: true,
      countryCode: true,
    },
  },
} as const;

type UsageItem = {
  id: string;
  orderId: string;
  name: string;
  unitPriceCents: number;
  doctorId: string | null;
  membershipEnrollmentId: string | null;
  membershipBenefitId: string | null;
  membershipDiscountCents: number | null;
  membershipAllowanceUsed: boolean;
  membershipOverrideReason: string | null;
  order: {
    orderNumber: string;
    createdAt: Date;
    currencyCode: string | null;
    countryCode: string | null;
  } | null;
};

type MemberIdentity = { firstName: string; lastName: string; membershipId: string };

type UsageLookups = {
  benefitTypeById: Map<string, MembershipBenefitType>;
  doctorNameById: Map<string, string>;
  memberById: Map<string, MemberIdentity>;
};

/** Resolve the two id-only columns for a batch of lines, in one query each. */
async function loadUsageLookups(
  items: UsageItem[],
  benefitTypeById: Map<string, MembershipBenefitType>,
): Promise<UsageLookups> {
  const doctorIds = [...new Set(items.map((i) => i.doctorId).filter(Boolean))] as string[];
  const enrollmentIds = [
    ...new Set(items.map((i) => i.membershipEnrollmentId).filter(Boolean)),
  ] as string[];

  const [doctors, members] = await Promise.all([
    doctorIds.length
      ? prisma.doctor.findMany({
          where: { id: { in: doctorIds } },
          select: { id: true, fullName: true },
        })
      : Promise.resolve([]),
    enrollmentIds.length
      ? prisma.membershipEnrollment.findMany({
          where: { id: { in: enrollmentIds } },
          select: { id: true, firstName: true, lastName: true, membershipId: true },
        })
      : Promise.resolve([]),
  ]);

  return {
    benefitTypeById,
    doctorNameById: new Map(doctors.map((d) => [d.id, d.fullName])),
    memberById: new Map(
      members.map((m) => [
        m.id,
        { firstName: m.firstName, lastName: m.lastName, membershipId: m.membershipId },
      ]),
    ),
  };
}

function toRow(item: UsageItem, lookups: UsageLookups): MembershipUsageRow {
  const discountCents = item.membershipDiscountCents ?? 0;
  const member = item.membershipEnrollmentId
    ? lookups.memberById.get(item.membershipEnrollmentId)
    : undefined;
  return {
    orderItemId: item.id,
    orderId: item.orderId,
    orderNumber: item.order?.orderNumber ?? "",
    bookedAt: item.order?.createdAt ?? new Date(0),
    serviceName: item.name,
    doctorName: item.doctorId ? (lookups.doctorNameById.get(item.doctorId) ?? null) : null,
    listPriceCents: item.unitPriceCents + discountCents,
    pricePaidCents: item.unitPriceCents,
    discountCents,
    benefitType: item.membershipBenefitId
      ? (lookups.benefitTypeById.get(item.membershipBenefitId) ?? null)
      : null,
    allowanceUsed: item.membershipAllowanceUsed,
    overrideReason: item.membershipOverrideReason,
    memberName: member ? `${member.firstName} ${member.lastName}`.trim() : null,
    membershipId: member?.membershipId ?? null,
    enrollmentId: item.membershipEnrollmentId,
    // Upper-cased, matching the section keys and every other place an ISO-2
    // code is rendered. `Country.code` is stored lowercase, so leaving it raw
    // would make a row's country and its own section's key differ.
    countryCode: item.order?.countryCode?.toUpperCase() ?? null,
  };
}

/** `createdAt` window for the order, open-ended at either end. */
function orderDateFilter(from?: Date | null, to?: Date | null) {
  if (!from && !to) return {};
  return {
    order: {
      createdAt: {
        ...(from ? { gte: from } : {}),
        ...(to ? { lte: to } : {}),
      },
    },
  };
}

export async function buildMembershipUsageReport(
  filters: MembershipUsageFilters,
): Promise<MembershipUsageReport | null> {
  const plan = await prisma.membershipPlan.findUnique({
    where: { id: filters.planId },
    select: {
      id: true,
      name: true,
      slug: true,
      primaryCountry: { select: { code: true } },
      // Covered countries with no bookings still get a section, shown as zero
      // (§23) — otherwise "this market is used by nobody" is indistinguishable
      // from "this market is not covered".
      countries: { select: { country: { select: { code: true } } } },
      levels: { select: { benefits: { select: { id: true, benefitType: true } } } },
    },
  });
  if (!plan) return null;

  const benefitTypeById = new Map<string, MembershipBenefitType>();
  for (const level of plan.levels) {
    for (const benefit of level.benefits) benefitTypeById.set(benefit.id, benefit.benefitType);
  }
  const benefitIds = [...benefitTypeById.keys()];

  const statusGroups = await prisma.membershipEnrollment.groupBy({
    by: ["status"],
    where: { planId: plan.id },
    _count: { _all: true },
  });
  const membersByStatus = { ...EMPTY_STATUS_COUNTS };
  for (const group of statusGroups) membersByStatus[group.status] = group._count._all;

  const dateFilter = orderDateFilter(filters.from, filters.to);

  // Real usage: every benefited line belonging to one of this plan's
  // enrollments. Reached through the enrollment rather than the benefit id so a
  // line survives its benefit row being deleted. The id list is materialised
  // because `OrderItem.membershipEnrollmentId` carries no relation to join on.
  const planEnrollmentIds = (
    await prisma.membershipEnrollment.findMany({
      where: { planId: plan.id },
      select: { id: true },
    })
  ).map((row) => row.id);

  const usageItems = planEnrollmentIds.length
    ? ((await prisma.orderItem.findMany({
        where: {
          membershipEnrollmentId: { in: planEnrollmentIds },
          membershipOverrideReason: null,
          ...dateFilter,
        },
        select: usageItemSelect,
        orderBy: { order: { createdAt: "desc" } },
      })) as UsageItem[])
    : [];

  // Goodwill: reached through the BENEFIT row, because an override for someone
  // holding no enrollment carries a null enrollment id and would otherwise be
  // invisible to this report entirely.
  const overrideItems = benefitIds.length
    ? ((await prisma.orderItem.findMany({
        where: {
          membershipBenefitId: { in: benefitIds },
          membershipOverrideReason: { not: null },
          ...dateFilter,
        },
        select: usageItemSelect,
        orderBy: { order: { createdAt: "desc" } },
      })) as UsageItem[])
    : [];

  const lookups = await loadUsageLookups([...usageItems, ...overrideItems], benefitTypeById);

  // Units are read off the counters, not summed from the ledger: the counter is
  // the authority (§7), and an ADMIN_ADJUST moves it without a matching spend.
  // Global — the pool is shared across every covered country (§36).
  const balances = await prisma.membershipAllowanceBalance.aggregate({
    where: { holderEnrollment: { planId: plan.id } },
    _sum: { allocated: true, used: true },
  });

  return {
    plan: { id: plan.id, name: plan.name, slug: plan.slug, countryCode: plan.primaryCountry.code },
    range: { from: filters.from ?? null, to: filters.to ?? null },
    membersByStatus,
    allowance: {
      allocated: balances._sum.allocated ?? 0,
      used: balances._sum.used ?? 0,
    },
    countries: buildCountrySections({
      usageItems,
      overrideItems,
      lookups,
      benefitTypeById,
      primaryCountryCode: plan.primaryCountry.code,
      coveredCodes: plan.countries.map((c) => c.country.code),
    }),
  };
}

/** An empty section, for a covered country with nothing booked in the range. */
function emptySection(countryCode: string, covered: boolean): MembershipUsageCountrySection {
  return {
    countryCode,
    currencyCode: null,
    covered,
    usage: {
      consultations: 0,
      byBenefitType: { ...EMPTY_TYPE_COUNTS },
      totalDiscountCents: 0,
      totalChargedCents: 0,
      rows: [],
    },
    overrides: { consultations: 0, totalValueCents: 0, rows: [] },
  };
}

/**
 * Split the plan's lines into per-country sections (§23).
 *
 * Nothing is summed across sections and no rate is applied anywhere — a
 * multi-country plan has no single currency, and a headline figure would be the
 * one number a partner quotes back.
 *
 * A line whose order somehow carries no country lands under `"??"` rather than
 * being dropped: an unattributable booking that silently disappears from a
 * usage report is worse than one an admin has to ask about.
 */
function buildCountrySections(args: {
  usageItems: UsageItem[];
  overrideItems: UsageItem[];
  lookups: UsageLookups;
  benefitTypeById: Map<string, MembershipBenefitType>;
  primaryCountryCode: string;
  coveredCodes: string[];
}): MembershipUsageCountrySection[] {
  const covered = new Set(args.coveredCodes.map((code) => code.toUpperCase()));
  const sections = new Map<string, MembershipUsageCountrySection>();
  const sectionFor = (raw: string | null | undefined): MembershipUsageCountrySection => {
    const code = (raw ?? "??").toUpperCase();
    let section = sections.get(code);
    if (!section) {
      section = emptySection(code, covered.has(code));
      sections.set(code, section);
    }
    return section;
  };

  for (const item of args.usageItems) {
    const section = sectionFor(item.order?.countryCode);
    section.currencyCode ??= item.order?.currencyCode ?? null;
    const type = item.membershipBenefitId
      ? args.benefitTypeById.get(item.membershipBenefitId)
      : undefined;
    if (type) section.usage.byBenefitType[type] += 1;
    section.usage.totalDiscountCents += item.membershipDiscountCents ?? 0;
    section.usage.totalChargedCents += item.unitPriceCents;
    section.usage.rows.push(toRow(item, args.lookups));
    section.usage.consultations += 1;
  }

  for (const item of args.overrideItems) {
    const section = sectionFor(item.order?.countryCode);
    section.currencyCode ??= item.order?.currencyCode ?? null;
    const row = toRow(item, args.lookups);
    section.overrides.rows.push(row);
    section.overrides.consultations += 1;
    section.overrides.totalValueCents += row.discountCents;
  }

  // The union: every covered country gets a section even with nothing in it.
  for (const code of covered) if (!sections.has(code)) sections.set(code, emptySection(code, true));

  const primary = args.primaryCountryCode.toUpperCase();
  return [...sections.values()].sort(
    (a, b) =>
      Number(b.countryCode === primary) - Number(a.countryCode === primary) ||
      a.countryCode.localeCompare(b.countryCode),
  );
}

export type MembershipMemberUsage = {
  enrollment: {
    id: string;
    membershipId: string;
    fullName: string;
    email: string;
    planId: string;
    planName: string;
    levelName: string;
    status: MembershipEnrollmentStatus;
  };
  rows: MembershipUsageRow[];
  totals: { consultations: number; discountCents: number; allowanceUsed: number; overrides: number };
};

/**
 * One member's bookings (§15). Includes their overrides, flagged — the point of
 * the drill-down is answering "which of their visits were overrides", which is
 * exactly what a report that hid them could not do.
 */
export async function buildMemberUsageReport(
  enrollmentId: string,
): Promise<MembershipMemberUsage | null> {
  const enrollment = await prisma.membershipEnrollment.findUnique({
    where: { id: enrollmentId },
    select: {
      id: true,
      membershipId: true,
      firstName: true,
      lastName: true,
      email: true,
      status: true,
      planId: true,
      plan: { select: { name: true, levels: { select: { benefits: { select: { id: true, benefitType: true } } } } } },
      level: { select: { name: true } },
    },
  });
  if (!enrollment) return null;

  const benefitTypeById = new Map<string, MembershipBenefitType>();
  for (const level of enrollment.plan.levels) {
    for (const benefit of level.benefits) benefitTypeById.set(benefit.id, benefit.benefitType);
  }

  const items = (await prisma.orderItem.findMany({
    where: { membershipEnrollmentId: enrollment.id },
    select: usageItemSelect,
    orderBy: { order: { createdAt: "desc" } },
  })) as UsageItem[];

  const lookups = await loadUsageLookups(items, benefitTypeById);
  const rows = items.map((item) => toRow(item, lookups));
  const real = rows.filter((row) => row.overrideReason == null);
  return {
    enrollment: {
      id: enrollment.id,
      membershipId: enrollment.membershipId,
      fullName: `${enrollment.firstName} ${enrollment.lastName}`.trim(),
      email: enrollment.email,
      planId: enrollment.planId,
      planName: enrollment.plan.name,
      levelName: enrollment.level.name,
      status: enrollment.status,
    },
    rows,
    totals: {
      consultations: real.length,
      discountCents: real.reduce((sum, row) => sum + row.discountCents, 0),
      allowanceUsed: real.filter((row) => row.allowanceUsed).length,
      overrides: rows.length - real.length,
    },
  };
}

/** CSV for `&format=csv` on the usage endpoint (§15) — not a separate route. */
export function usageReportToCsv(report: MembershipUsageReport): string {
  const header = [
    "order_number",
    "booked_at",
    // §23. Second column rather than last: it is what a multi-country partner
    // sorts and filters on first, and a total taken across it is wrong.
    "country",
    "member",
    "membership_id",
    "service",
    "doctor",
    "list_price_cents",
    "price_paid_cents",
    "discount_cents",
    "benefit_type",
    "allowance_unit_used",
    "override",
    "override_reason",
  ];
  const escape = (value: unknown): string => {
    const text = value == null ? "" : String(value);
    return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  const line = (row: MembershipUsageRow, isOverride: boolean) =>
    [
      row.orderNumber,
      row.bookedAt.toISOString(),
      row.countryCode,
      row.memberName,
      row.membershipId,
      row.serviceName,
      row.doctorName,
      row.listPriceCents,
      row.pricePaidCents,
      row.discountCents,
      row.benefitType,
      row.allowanceUsed ? "yes" : "no",
      isOverride ? "yes" : "no",
      row.overrideReason,
    ]
      .map(escape)
      .join(",");

  // Overrides are in the same file, flagged by their own column, rather than in
  // a second export — one row per booking is what a partner reconciles against,
  // and a separate file is one nobody opens. The flag is what keeps them
  // excludable from a total without being hidden from the reader.
  //
  // One file across every country, with the country on each row, rather than one
  // file per section: the sections exist to stop money being ADDED across
  // currencies, which a spreadsheet column does not do on its own.
  return [
    header.join(","),
    ...report.countries.flatMap((section) => [
      ...section.usage.rows.map((row) => line(row, false)),
      ...section.overrides.rows.map((row) => line(row, true)),
    ]),
  ].join("\r\n");
}
