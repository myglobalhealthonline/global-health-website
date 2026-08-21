import { join } from "node:path";
import { randomBytes } from "node:crypto";
import { config as loadEnv } from "dotenv";
import type { Prisma } from "@prisma/client";

loadEnv({ path: join(__dirname, "..", ".env") });

/**
 * Import ONE legacy subscriber (old Wix platform) into the new subscription
 * system, then hand billing over to our Ireland Stripe account without a gap
 * and without double-charging.
 *
 *   node --import tsx scripts/import-legacy-subscriber.ts            # dry run
 *   node --import tsx scripts/import-legacy-subscriber.ts --commit
 *   node --import tsx scripts/import-legacy-subscriber.ts --checkout-only
 *
 * What it does (all steps idempotent — safe to re-run):
 *   1. Upsert the User + PatientProfile from the legacy record.
 *   2. Create the UserSubscription ACTIVE on the current legacy period, with
 *      `paidMonthsCount` = the months already paid elsewhere (so perk unlock
 *      thresholds are honoured — they don't restart at zero).
 *   3. Mirror the legacy payment history as SubscriptionInvoice rows so
 *      /account/payments shows the real timeline. These are DISPLAY-ONLY (§38.1
 *      — no PDF, no number generation, no revenue ledger entry): the money was
 *      taken on the old platform and is already booked there.
 *   4. Grant credits: the current period's consultation credits + one wellness
 *      grant per already-paid month (wellness never expires, D13; consultation
 *      credits reset monthly, so back-granting them would be fiction).
 *   5. Mint a Stripe Checkout link with `trial_end` = the next legacy billing
 *      date. The member enters their card (it could not travel from Wix), is
 *      charged €0 today, and Stripe raises the first real €20 invoice on that
 *      date — same day of the month they have always been billed.
 *
 * The renewal invoice then flows through the normal webhook path: it grants
 * month 12, advances paidMonthsCount, and mirrors a REAL Stripe invoice.
 *
 * Requires BILLING_DRIVER=stripe + STRIPE_SECRET_KEY (steps 1-4 run without
 * them; only the checkout link needs Stripe). Run it against the environment
 * that owns the live database — never point it at a local .env holding
 * production keys by accident: it creates a real Stripe customer.
 */

interface LegacyInvoice {
  /** Legacy invoice number, as printed on the old platform's document. */
  number: string;
  /** Issue date = the date the charge was taken (UTC). */
  issuedOn: string;
  amountCents: number;
}

interface LegacySubscriber {
  /** Where the record came from — becomes part of the mirrored invoice ids. */
  source: string;
  countryCode: string;
  planSlug: string;
  email: string;
  fullName: string;
  phone: string;
  dateOfBirth: string;
  addressLine1: string;
  addressCountryCode: string;
  currency: string;
  /** First payment on the old platform. */
  startedOn: string;
  /** Start of the period the member is currently paid up for. */
  currentPeriodStart: string;
  /** Next billing date on the old platform — our first charge lands here. */
  nextPaymentOn: string;
  /** Oldest first. */
  invoices: LegacyInvoice[];
}

const LEGACY: LegacySubscriber = {
  source: "wix",
  countryCode: "ie",
  planSlug: "essential-care",
  email: "gustavopierre@gmail.com",
  fullName: "Gustavo Moreira Pierre",
  phone: "+353830923728",
  dateOfBirth: "1969-02-14",
  addressLine1: "Apt 6, Tyrconnell Holiday Apartments, Station Road",
  addressCountryCode: "ie",
  currency: "eur",
  startedOn: "2025-09-26",
  currentPeriodStart: "2026-07-26",
  nextPaymentOn: "2026-08-26",
  invoices: [
    { number: "0000228", issuedOn: "2025-09-26", amountCents: 2000 },
    { number: "0000272", issuedOn: "2025-10-26", amountCents: 2000 },
    { number: "0000334", issuedOn: "2025-11-26", amountCents: 2000 },
    { number: "0000423", issuedOn: "2025-12-26", amountCents: 2000 },
    { number: "0000461", issuedOn: "2026-01-26", amountCents: 2000 },
    { number: "0000462", issuedOn: "2026-02-26", amountCents: 2000 },
    { number: "0000464", issuedOn: "2026-03-26", amountCents: 2000 },
    { number: "0000465", issuedOn: "2026-04-26", amountCents: 2000 },
    { number: "0000466", issuedOn: "2026-05-26", amountCents: 2000 },
    { number: "0000467", issuedOn: "2026-06-26", amountCents: 2000 },
    { number: "0000468", issuedOn: "2026-07-26", amountCents: 2000 },
  ],
};

/** UTC midnight — the legacy dates carry no time-of-day. */
function utcDate(iso: string): Date {
  return new Date(`${iso}T00:00:00.000Z`);
}

/** Stable id for a mirrored legacy payment (upsert key → re-runs are no-ops). */
function legacyInvoiceId(inv: LegacyInvoice): string {
  return `legacy_${LEGACY.source}_${inv.number}`;
}

const log = (msg: string): void => console.log(`[legacy-sub] ${msg}`);

async function main(): Promise<void> {
  const commit = process.argv.includes("--commit");
  const checkoutOnly = process.argv.includes("--checkout-only");
  const skipCheckout = process.argv.includes("--no-checkout");
  // Reusable link instead of a 24h Checkout session — for mailing a member a
  // link that has to survive several days.
  const paymentLinkMode = process.argv.includes("--payment-link");

  const { prisma } = await import("../src/db/prisma.js");
  const { getBillingPort } = await import("../src/modules/billing/billing.factory.js");
  const { syncPlanStripePrice } = await import(
    "../src/modules/billing/price-sync.service.js"
  );
  const { isResourceMissing } = await import("../src/modules/billing/billing.stripe.js");
  const { captureSnapshot } = await import(
    "../src/modules/subscriptions/plan-snapshot.service.js"
  );
  const { syncPerkGrants } = await import(
    "../src/modules/subscriptions/subscription-grant.service.js"
  );
  const { grantMonthlyCredits } = await import(
    "../src/modules/credits/credit-balance.service.js"
  );
  const { recordAudit } = await import("../src/modules/audit/audit.service.js");
  const { env } = await import("../src/config/env.js");

  // ── resolve country + plan ────────────────────────────────────────────────
  const country = await prisma.country.findFirst({
    // Country codes are stored lowercase — match case-insensitively.
    where: { code: { equals: LEGACY.countryCode, mode: "insensitive" } },
    select: { id: true, code: true, enabledFeatures: true },
  });
  if (!country) throw new Error(`country ${LEGACY.countryCode} not found`);
  if (!country.enabledFeatures.includes("subscriptions")) {
    throw new Error(
      `country ${country.code} does not have the 'subscriptions' feature enabled — ` +
        "enable it in admin → countries before importing a subscriber",
    );
  }

  const plan = await prisma.pricingPlan.findUnique({
    where: { countryId_slug: { countryId: country.id, slug: LEGACY.planSlug } },
  });
  if (!plan) throw new Error(`plan ${LEGACY.planSlug} not found for ${country.code}`);
  if (plan.monthlyPriceCents !== LEGACY.invoices[LEGACY.invoices.length - 1].amountCents) {
    log(
      `WARNING price mismatch — plan is ${plan.monthlyPriceCents}c, legacy last charge was ` +
        `${LEGACY.invoices[LEGACY.invoices.length - 1].amountCents}c. The member will be billed ` +
        "the PLAN price from the next cycle.",
    );
  }

  const paidMonths = LEGACY.invoices.length;
  const periodStart = utcDate(LEGACY.currentPeriodStart);
  const periodEnd = utcDate(LEGACY.nextPaymentOn);
  const startedAt = utcDate(LEGACY.startedOn);

  log(`plan ${plan.name} (${plan.slug}) — ${plan.monthlyPriceCents}c ${plan.currencyCode}`);
  log(
    `${LEGACY.email}: ${paidMonths} paid months, period ${LEGACY.currentPeriodStart} → ` +
      `${LEGACY.nextPaymentOn}, first Stripe charge ${LEGACY.nextPaymentOn}`,
  );
  log(
    `credits per paid month: consultation ${plan.monthlyConsultationCredits}, ` +
      `wellness ${plan.wellnessCreditsPerMonth}`,
  );

  const existingUser = await prisma.user.findUnique({
    where: { email: LEGACY.email },
    select: { id: true, fullName: true },
  });
  const existingSub = existingUser
    ? await prisma.userSubscription.findFirst({
        where: {
          userId: existingUser.id,
          status: { in: ["ACTIVE", "PAST_DUE", "INCOMPLETE", "PAUSED"] },
        },
      })
    : null;

  if (!commit && !checkoutOnly) {
    log(`DRY RUN — nothing written. Existing user: ${existingUser?.id ?? "none"}`);
    log(`Existing subscription: ${existingSub ? `${existingSub.id} (${existingSub.status})` : "none"}`);
    log("Re-run with --commit to apply.");
    return;
  }

  /**
   * Capture the card and defer the first charge to the legacy anniversary.
   * Split out because a Checkout session expires within 24h — `--checkout-only`
   * re-mints the link without touching the already-imported data.
   */
  async function mintPaymentLink(
    subscriptionId: string,
    userId: string,
    existingCustomerId: string | null,
  ): Promise<void> {
    const billing = getBillingPort();
    if (billing.driver !== "stripe") {
      log("BILLING_DRIVER is not 'stripe' — skipping the payment link (nothing real to mint).");
      return;
    }
    if (periodEnd.getTime() - Date.now() < 48 * 60 * 60 * 1000) {
      throw new Error(
        `next payment ${LEGACY.nextPaymentOn} is less than 48h away — Stripe rejects a trial_end ` +
          "that close. Take the first charge manually or move the anchor a cycle out.",
      );
    }

    let stripePriceId = plan!.stripePriceId;
    if (!stripePriceId || stripePriceId.includes("_fake_")) {
      ({ stripePriceId } = await syncPlanStripePrice(plan!.id));
    }

    const customer = await billing.findOrCreateCustomer({
      userId,
      email: LEGACY.email,
      name: LEGACY.fullName,
      existingCustomerId,
    });
    await prisma.userSubscription.update({
      where: { id: subscriptionId },
      data: { stripeCustomerId: customer.customerId, stripePriceId },
    });

    const base = env.PUBLIC_SITE_URL?.replace(/\/+$/, "") ?? "http://localhost:3000";
    const checkoutParams = {
      successUrl: `${base}/account/membership?subscription=ok`,
      cancelUrl: `${base}/account/membership?subscription=cancelled`,
      automaticTax: false,
      metadata: { kind: "subscription", internalSubId: subscriptionId, userId },
      countryCode: country!.code,
      // Charge €0 today, first real invoice on the legacy anniversary.
      trialEnd: periodEnd,
    };

    let checkout;
    try {
      checkout = await billing.createSubscriptionCheckout({
        customerId: customer.customerId,
        priceId: stripePriceId,
        ...checkoutParams,
      });
    } catch (err) {
      // Stale/cross-account Price id — typically a TEST-mode price left on the
      // plan row from seeding, rejected by a live key. Mint a fresh
      // Product+Price on the CURRENT account and retry once, exactly as the
      // patient subscribe flow does (subscription.service.ts).
      if (!isResourceMissing(err)) throw err;
      log("plan's Stripe price is not on this account — re-syncing a fresh one");
      ({ stripePriceId } = await syncPlanStripePrice(plan!.id, { force: true }));
      await prisma.userSubscription.update({
        where: { id: subscriptionId },
        data: { stripePriceId },
      });
      checkout = await billing.createSubscriptionCheckout({
        customerId: customer.customerId,
        priceId: stripePriceId,
        ...checkoutParams,
      });
    }

    log("");
    log(`PAYMENT LINK (send to ${LEGACY.email}) — valid 24h, re-run --checkout-only for a fresh one:`);
    log(checkout.url);
    log(
      `€0 today · first charge ${LEGACY.nextPaymentOn} · ` +
        `${(plan!.monthlyPriceCents / 100).toFixed(2)} ${plan!.currencyCode}`,
    );
  }

  /**
   * Reusable payment link. Unlike the Checkout session it does NOT defer the
   * first charge: the member is billed the moment they complete it, and their
   * renewal date becomes that day. That is the price of a link that outlives
   * Stripe's 24h session cap — say so in whatever message carries the link.
   */
  async function mintPaymentLink7Day(subscriptionId: string): Promise<void> {
    const billing = getBillingPort();
    if (billing.driver !== "stripe") {
      log("BILLING_DRIVER is not 'stripe' — skipping (nothing real to mint).");
      return;
    }
    let stripePriceId = plan!.stripePriceId;
    if (!stripePriceId || stripePriceId.includes("_fake_")) {
      ({ stripePriceId } = await syncPlanStripePrice(plan!.id));
    }
    const base = env.PUBLIC_SITE_URL?.replace(/\/+$/, "") ?? "http://localhost:3000";

    let link;
    try {
      link = await billing.createSubscriptionPaymentLink({
        priceId: stripePriceId,
        metadata: { kind: "subscription", internalSubId: subscriptionId },
        returnUrl: `${base}/account/membership?subscription=ok`,
        countryCode: country!.code,
      });
    } catch (err) {
      if (!isResourceMissing(err)) throw err;
      log("plan's Stripe price is not on this account — re-syncing a fresh one");
      ({ stripePriceId } = await syncPlanStripePrice(plan!.id, { force: true }));
      await prisma.userSubscription.update({
        where: { id: subscriptionId },
        data: { stripePriceId },
      });
      link = await billing.createSubscriptionPaymentLink({
        priceId: stripePriceId,
        metadata: { kind: "subscription", internalSubId: subscriptionId },
        returnUrl: `${base}/account/membership?subscription=ok`,
        countryCode: country!.code,
      });
    }

    log("");
    log(`REUSABLE PAYMENT LINK (${link.paymentLinkId}) — no expiry; deactivate when done:`);
    log(link.url);
    log(`Charges ${(plan!.monthlyPriceCents / 100).toFixed(2)} ${plan!.currencyCode} IMMEDIATELY on completion.`);
    log("Accepts ONE completed payment, then stops working.");
  }

  if (checkoutOnly) {
    if (!existingSub) throw new Error("--checkout-only: no imported subscription found — run --commit first");
    if (paymentLinkMode) {
      await mintPaymentLink7Day(existingSub.id);
      return;
    }
    if (existingSub.stripeSubscriptionId) {
      log(
        `subscription already linked to Stripe ${existingSub.stripeSubscriptionId} — the card is ` +
          "on file, no payment link needed.",
      );
      return;
    }
    await mintPaymentLink(existingSub.id, existingSub.userId, existingSub.stripeCustomerId);
    return;
  }

  // ── 1. user + patient profile ─────────────────────────────────────────────
  const bcrypt = (await import("bcryptjs")).default;
  // No password travels from the legacy platform. A random one the member can
  // never guess + mustChangePassword: they take the "forgot password" route,
  // which also proves control of the mailbox before the account opens.
  const placeholderPassword = await bcrypt.hash(randomBytes(24).toString("hex"), 10);

  const user = await prisma.user.upsert({
    where: { email: LEGACY.email },
    create: {
      email: LEGACY.email,
      passwordHash: placeholderPassword,
      fullName: LEGACY.fullName,
      phone: LEGACY.phone,
      dateOfBirth: utcDate(LEGACY.dateOfBirth),
      role: "PATIENT",
      // Verified on the old platform — they have been paying against this
      // address for a year. Don't force re-verification to reach the portal.
      emailVerifiedAt: new Date(),
      mustChangePassword: true,
    },
    // Never overwrite a live account's name/phone/password on a re-run — only
    // fill blanks.
    update: {
      fullName: existingUser?.fullName || LEGACY.fullName,
      phone: LEGACY.phone,
      dateOfBirth: utcDate(LEGACY.dateOfBirth),
    },
  });
  log(`user ${user.id} (${existingUser ? "updated" : "created"})`);

  await prisma.patientProfile.upsert({
    where: { email: LEGACY.email },
    create: {
      email: LEGACY.email,
      userId: user.id,
      fullName: LEGACY.fullName,
      phone: LEGACY.phone,
      dateOfBirth: utcDate(LEGACY.dateOfBirth),
      addressLine1: LEGACY.addressLine1,
      addressCountryCode: LEGACY.addressCountryCode,
      legacyExtra: { source: LEGACY.source, importedPlan: LEGACY.planSlug },
    },
    update: {
      userId: user.id,
      phone: LEGACY.phone,
      dateOfBirth: utcDate(LEGACY.dateOfBirth),
      addressLine1: LEGACY.addressLine1,
      addressCountryCode: LEGACY.addressCountryCode,
    },
  });
  log("patient profile upserted");

  // ── 2. subscription row ───────────────────────────────────────────────────
  // A pre-existing sub that is NOT this import (it has a Stripe subscription of
  // its own) means the member already re-subscribed here. Stop rather than
  // stack a second membership on one account (§36.8).
  if (existingSub?.stripeSubscriptionId) {
    throw new Error(
      `user already has subscription ${existingSub.id} linked to Stripe ` +
        `${existingSub.stripeSubscriptionId} — reconcile manually, refusing to import over it`,
    );
  }

  const snapshot = await captureSnapshot(plan.id, 0);

  const sub =
    existingSub ??
    (await prisma.userSubscription.create({
      data: {
        userId: user.id,
        planId: plan.id,
        countryCode: country.code,
        // ACTIVE, not INCOMPLETE: the current period is genuinely paid for — on
        // the old platform. Withholding access until the card lands would take
        // away a month they already bought.
        status: "ACTIVE",
        currentPeriodStart: periodStart,
        currentPeriodEnd: periodEnd,
        paidMonthsCount: paidMonths,
        startedAt,
        planSnapshot: snapshot as unknown as Prisma.InputJsonValue,
        snapshotVersion: 0,
      },
    }));

  if (existingSub) {
    await prisma.userSubscription.update({
      where: { id: sub.id },
      data: {
        planId: plan.id,
        countryCode: country.code,
        status: "ACTIVE",
        currentPeriodStart: periodStart,
        currentPeriodEnd: periodEnd,
        paidMonthsCount: paidMonths,
        startedAt,
        planSnapshot: snapshot as unknown as Prisma.InputJsonValue,
      },
    });
  }
  log(`subscription ${sub.id} ACTIVE, paidMonthsCount=${paidMonths}`);

  // ── 3 + 4. invoice mirror + credit grants, one period at a time ───────────
  // Chronological order matters twice over: the consultation grant is an
  // absolute SET (each month resets the last), so the LAST iteration must be
  // the current period; and the account page orders history by row createdAt,
  // so inserting oldest-first makes "newest first" come out right.
  await prisma.$transaction(
    async (tx) => {
      for (const [i, inv] of LEGACY.invoices.entries()) {
        const invPeriodStart = utcDate(inv.issuedOn);
        const isCurrentPeriod = i === LEGACY.invoices.length - 1;

        await tx.subscriptionInvoice.upsert({
          where: { stripeInvoiceId: legacyInvoiceId(inv) },
          create: {
            userSubscriptionId: sub.id,
            // Not a Stripe id — a synthetic key so the upsert is idempotent and
            // nothing downstream mistakes it for something refundable at the
            // provider (refundInvoicePayment would 404 on it, and the refund
            // path now fails closed on an unlinked subscription anyway).
            stripeInvoiceId: legacyInvoiceId(inv),
            number: inv.number,
            amountPaidCents: inv.amountCents,
            currency: LEGACY.currency,
            taxCents: 0,
            periodStart: invPeriodStart,
            hostedInvoiceUrl: null,
            pdfUrl: null,
            status: "paid",
          },
          update: {
            amountPaidCents: inv.amountCents,
            status: "paid",
          },
        });

        // Consultation credits reset every month and don't roll over (Q1=A), so
        // only the CURRENT period gets them — back-granting eleven expired
        // months would be inventing credits. Wellness is additive and never
        // expires (D13), so every paid month earns its share.
        await grantMonthlyCredits(tx, {
          userSubscriptionId: sub.id,
          userId: user.id,
          periodStart: invPeriodStart,
          consultationCredits: isCurrentPeriod ? snapshot.monthlyConsultationCredits : 0,
          wellnessCredits: snapshot.wellnessCreditsPerMonth,
        });
      }

      // Perk thresholds read paidMonthsCount, which is already at 11 — anything
      // gated on "after N paid months" unlocks now, as it would have on the old
      // platform.
      const unlocked = await syncPerkGrants(tx, sub.id, snapshot, paidMonths);
      if (unlocked.length) log(`perks unlocked: ${unlocked.join(", ")}`);
    },
    { timeout: 60_000 },
  );
  log(`mirrored ${LEGACY.invoices.length} legacy payments + granted credits`);

  await recordAudit({
    action: "SUBSCRIPTION_CREATED",
    entityType: "UserSubscription",
    entityId: sub.id,
    actorUserId: null,
    metadata: {
      importedFrom: LEGACY.source,
      paidMonthsCount: paidMonths,
      legacyInvoices: LEGACY.invoices.map((i) => i.number),
      firstStripeChargeAt: LEGACY.nextPaymentOn,
    },
  });

  if (skipCheckout) {
    log("--no-checkout: skipping the payment link. Sub has NO card on file yet.");
    return;
  }

  // ── 5. payment link (card capture, first charge deferred) ─────────────────
  await mintPaymentLink(sub.id, user.id, sub.stripeCustomerId);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
