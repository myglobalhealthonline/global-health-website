import { Prisma } from "@prisma/client";
import type { LocaleCode } from "@prisma/client";
import { prisma } from "../../db/prisma.js";
import { generateCouponCode, normalizeCouponCode } from "./coupon-code.js";
import { resolveCouponRecipientLocale, sendCouponEmail } from "./coupon-emails.js";
import type {
  CouponRecipientInput,
  CreateCouponInput,
} from "../../validations/admin-coupons.schema.js";

/** Raised when a code the admin typed is already in use. Route replies 409. */
export class CouponCodeTakenError extends Error {
  constructor(code: string) {
    super(`Coupon code ${code} is already in use`);
    this.name = "CouponCodeTakenError";
  }
}

/**
 * Raised when a PATCH would set `maxRedemptions` below what has already been
 * redeemed. Caught here rather than left to the `Coupon_cap_chk` constraint,
 * which would surface as an opaque database error the admin cannot act on.
 */
export class CouponCapBelowRedeemedError extends Error {
  constructor(redeemed: number) {
    super(
      `This coupon has already been redeemed ${redeemed} times — the limit cannot go below that`,
    );
    this.name = "CouponCapBelowRedeemedError";
  }
}

export type CouponListFilters = {
  page: number;
  pageSize: number;
  q?: string;
  kind?: "PERSONAL" | "GENERAL";
  status?: "active" | "scheduled" | "expired" | "exhausted" | "disabled";
};

function statusWhere(status: CouponListFilters["status"], now: Date): Prisma.CouponWhereInput {
  switch (status) {
    case "disabled":
      return { active: false };
    case "scheduled":
      return { active: true, validFrom: { gt: now } };
    case "expired":
      return { active: true, validUntil: { lt: now } };
    case "exhausted":
      // "Fully redeemed" is a column-against-column comparison, which a Prisma
      // filter cannot express. This narrows to rows whose counter has moved at
      // all; the exact test happens in the mapper below.
      return { redeemedCount: { gt: 0 } };
    case "active":
      return { active: true, validFrom: { lte: now }, validUntil: { gte: now } };
    default:
      return {};
  }
}

type StatusInput = {
  active: boolean;
  validFrom: Date;
  validUntil: Date;
  maxRedemptions: number;
  redeemedCount: number;
};

/** One derived status for the list badge and the detail header. */
export function couponStatus(c: StatusInput, now = new Date()) {
  if (!c.active) return "disabled" as const;
  if (c.redeemedCount >= c.maxRedemptions) return "exhausted" as const;
  if (now < c.validFrom) return "scheduled" as const;
  if (now > c.validUntil) return "expired" as const;
  return "active" as const;
}

export async function listCoupons(filters: CouponListFilters) {
  const now = new Date();
  const where: Prisma.CouponWhereInput = {
    ...statusWhere(filters.status, now),
    ...(filters.kind ? { kind: filters.kind } : {}),
    ...(filters.q
      ? {
          OR: [
            { code: { contains: filters.q.toUpperCase() } },
            { personalEmail: { contains: filters.q.toLowerCase(), mode: "insensitive" } },
            { personalName: { contains: filters.q, mode: "insensitive" } },
            { internalNote: { contains: filters.q, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const soon = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const [total, rows, summary] = await Promise.all([
    prisma.coupon.count({ where }),
    prisma.coupon.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (filters.page - 1) * filters.pageSize,
      take: filters.pageSize,
      select: {
        id: true,
        code: true,
        kind: true,
        scope: true,
        discountPercent: true,
        personalEmail: true,
        personalName: true,
        validFrom: true,
        validUntil: true,
        maxRedemptions: true,
        redeemedCount: true,
        active: true,
        internalNote: true,
        createdAt: true,
        _count: { select: { recipients: true } },
      },
    }),
    // Computed here rather than in the page: the counts are for the WHOLE
    // catalogue, not the current page, and a React server component may not
    // call `Date.now()` during render.
    (async () => {
      const [active, expiring, redemptions] = await Promise.all([
        prisma.coupon.count({
          where: { active: true, validFrom: { lte: now }, validUntil: { gte: now } },
        }),
        prisma.coupon.count({
          where: { active: true, validFrom: { lte: now }, validUntil: { gte: now, lte: soon } },
        }),
        prisma.couponRedemption.count({ where: { status: { in: ["RESERVED", "CONSUMED"] } } }),
      ]);
      return { active, expiring, redemptions };
    })(),
  ]);

  const items = rows
    .map((c) => ({ ...c, status: couponStatus(c, now) }))
    .filter((c) => (filters.status === "exhausted" ? c.status === "exhausted" : true));

  return { items, total, page: filters.page, pageSize: filters.pageSize, summary };
}

export async function getCouponDetail(id: string) {
  const coupon = await prisma.coupon.findUnique({
    where: { id },
    include: {
      recipients: { orderBy: { createdAt: "desc" } },
      redemptions: {
        orderBy: { createdAt: "desc" },
        take: 200,
        include: {
          order: {
            select: { id: true, orderNumber: true, totalCents: true, currencyCode: true },
          },
        },
      },
    },
  });
  if (!coupon) return null;
  return { ...coupon, status: couponStatus(coupon) };
}

/**
 * A PERSONAL coupon's recipient list is not admin-supplied — it IS the assigned
 * person, so the "email it to them now" checkbox needs no separate entry.
 */
function buildRecipientRows(input: CreateCouponInput): CouponRecipientInput[] {
  if (input.kind === "PERSONAL") {
    return input.personalEmail
      ? [{ email: input.personalEmail, fullName: input.personalName ?? null }]
      : [];
  }
  return input.recipients ?? [];
}

/**
 * Mint a coupon. The code is generated when the admin did not type one, and a
 * generated collision draws again rather than failing — 32 symbols over 10
 * places makes that a formality, but a 500 on a lottery loss is not acceptable.
 * A collision on an admin-TYPED code is their mistake to fix, so it surfaces.
 */
export async function createCoupon(
  input: CreateCouponInput,
  actorUserId: string | null,
): Promise<{ id: string; code: string }> {
  const explicitCode = input.code ? normalizeCouponCode(input.code) : null;

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const code = explicitCode ?? generateCouponCode();
    try {
      return await prisma.coupon.create({
        data: {
          code,
          kind: input.kind,
          scope: input.scope,
          discountPercent: input.discountPercent,
          personalEmail: input.kind === "PERSONAL" ? (input.personalEmail ?? null) : null,
          personalName: input.kind === "PERSONAL" ? (input.personalName ?? null) : null,
          validFrom: new Date(input.validFrom),
          validUntil: new Date(input.validUntil),
          maxRedemptions: input.maxRedemptions,
          internalNote: input.internalNote ?? null,
          createdByUserId: actorUserId,
          recipients: {
            createMany: {
              data: buildRecipientRows(input).map((r) => ({
                email: r.email,
                fullName: r.fullName ?? null,
                locale: (r.locale ?? null) as LocaleCode | null,
                patientProfileId: r.patientProfileId ?? null,
              })),
              skipDuplicates: true,
            },
          },
        },
        select: { id: true, code: true },
      });
    } catch (err) {
      const isUniqueViolation =
        err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002";
      if (!isUniqueViolation) throw err;
      if (explicitCode) throw new CouponCodeTakenError(explicitCode);
    }
  }
  throw new Error("Could not allocate a unique coupon code");
}

/** Raised when an edit would leave the validity window inverted. */
export class CouponWindowInvalidError extends Error {
  constructor() {
    super("The end of the validity window must be after its start");
    this.name = "CouponWindowInvalidError";
  }
}

export async function updateCoupon(
  id: string,
  patch: {
    active?: boolean;
    validFrom?: string;
    validUntil?: string;
    maxRedemptions?: number;
    internalNote?: string;
  },
) {
  const existing = await prisma.coupon.findUnique({
    where: { id },
    select: { redeemedCount: true, validFrom: true, validUntil: true },
  });
  if (!existing) return null;
  if (patch.maxRedemptions != null && patch.maxRedemptions < existing.redeemedCount) {
    throw new CouponCapBelowRedeemedError(existing.redeemedCount);
  }

  // Either end may be edited alone, so the check is against the RESULTING
  // window, not against whatever happens to be in the patch.
  const nextFrom = patch.validFrom ? new Date(patch.validFrom) : existing.validFrom;
  const nextUntil = patch.validUntil ? new Date(patch.validUntil) : existing.validUntil;
  if (nextUntil <= nextFrom) throw new CouponWindowInvalidError();

  return prisma.coupon.update({
    where: { id },
    data: {
      ...(patch.active != null ? { active: patch.active } : {}),
      ...(patch.validFrom ? { validFrom: nextFrom } : {}),
      ...(patch.validUntil ? { validUntil: nextUntil } : {}),
      ...(patch.maxRedemptions != null ? { maxRedemptions: patch.maxRedemptions } : {}),
      ...(patch.internalNote != null ? { internalNote: patch.internalNote } : {}),
    },
  });
}

export async function addCouponRecipients(couponId: string, recipients: CouponRecipientInput[]) {
  if (recipients.length === 0) return { added: 0 };
  const result = await prisma.couponRecipient.createMany({
    data: recipients.map((r) => ({
      couponId,
      email: r.email,
      fullName: r.fullName ?? null,
      locale: (r.locale ?? null) as LocaleCode | null,
      patientProfileId: r.patientProfileId ?? null,
    })),
    // `@@unique([couponId, email])` makes a repeated Send a no-op rather than a
    // duplicate mail.
    skipDuplicates: true,
  });
  return { added: result.count };
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Send the coupon to its pending recipients — ONE MESSAGE EACH, single `to`,
 * no CC and no BCC, so nobody sees anybody else's address and the greeting and
 * language can differ per person.
 *
 * Sequential on purpose. The shared SMTP pool is capped at 20 messages/second
 * (`smtp-send.ts`), and a 200-address `Promise.all` trips it — the same
 * decision as `membership-card-issue.ts`. A failure is recorded on its own row
 * and never aborts the batch, so one dead address cannot cost the other 199
 * their email.
 *
 * NOTE: Migadu caps outbound mail at 100/day, so a blast larger than that has
 * to be split across days. The admin UI shows the recipient count first.
 */
export async function sendCouponEmails(
  couponId: string,
  opts: { onlyRecipientIds?: string[]; adminCountryCode?: string | null } = {},
): Promise<{ sent: number; failed: number }> {
  const coupon = await prisma.coupon.findUnique({
    where: { id: couponId },
    select: {
      id: true,
      code: true,
      kind: true,
      discountPercent: true,
      validUntil: true,
      personalEmail: true,
    },
  });
  if (!coupon) return { sent: 0, failed: 0 };

  const rows = await prisma.couponRecipient.findMany({
    where: {
      couponId,
      ...(opts.onlyRecipientIds?.length
        ? { id: { in: opts.onlyRecipientIds } }
        : { status: { not: "SENT" } }),
    },
    orderBy: { createdAt: "asc" },
  });

  let sent = 0;
  let failed = 0;

  for (const [index, row] of rows.entries()) {
    try {
      const locale = await resolveCouponRecipientLocale({
        email: row.email,
        explicitLocale: row.locale,
        adminCountryCode: opts.adminCountryCode ?? null,
      });
      const result = await sendCouponEmail({
        to: row.email,
        fullName: row.fullName,
        locale,
        code: coupon.code,
        discountPercent: coupon.discountPercent,
        validUntil: coupon.validUntil,
        personalEmail: coupon.kind === "PERSONAL" ? coupon.personalEmail : null,
      });
      if (!result.ok) throw new Error(result.message);
      await prisma.couponRecipient.update({
        where: { id: row.id },
        data: { status: "SENT", sentAt: new Date(), error: null, locale },
      });
      sent += 1;
    } catch (err) {
      await prisma.couponRecipient.update({
        where: { id: row.id },
        data: {
          status: "FAILED",
          error: (err instanceof Error ? err.message : String(err)).slice(0, 500),
        },
      });
      failed += 1;
    }
    // Only throttle once the batch is big enough for the pool's own limiter to
    // matter — a two-recipient send should feel instant to the admin.
    if (rows.length > 20 && index < rows.length - 1) await sleep(150);
  }

  return { sent, failed };
}
