import type { Prisma, PrismaClient } from "@prisma/client";

/**
 * Copy a product order's shipping address onto the patient's chart.
 *
 * Why this exists: `backfillPatientProfile` (complete-order-payment) fills the
 * chart from `OrderItem.patientAddress*` — the booking-form snapshot. Product
 * lines (HEALTH_TEST, PRESCRIPTION_SERVICE) have no booking form, so those
 * columns are always null and the address the buyer typed at checkout lived
 * ONLY on `Order.ship*`. A kit-only order therefore left the chart address-less
 * (ORD-000490), which is exactly the chart a doctor or an admin reads when they
 * ask "where does this patient live".
 *
 * `Order.ship*` stays the per-checkout ship-to (a patient may post a kit to a
 * different address); this promotes it to the chart's canonical "home" only
 * when the chart has no address yet. FILL-ONLY, never overwrite — an address a
 * patient set on their profile, or one a clinician corrected, outranks a
 * shipping label typed months later.
 *
 * Safe to call repeatedly: the second run finds every column already filled and
 * writes nothing.
 */

/** Minimum Prisma surface — so a `$transaction` client is accepted too. */
type ProfileDb = {
  patientProfile: Pick<PrismaClient["patientProfile"], "findUnique" | "upsert" | "updateMany">;
};

export type OrderShippingProfileInput = {
  email: string;
  fullName: string | null;
  phone: string | null;
  userId: string | null;
  shipName: string | null;
  shipLine1: string | null;
  shipLine2: string | null;
  shipCity: string | null;
  shipPostalCode: string | null;
  shipCountryCode: string | null;
};

export type OrderShippingProfileOutcome =
  /** No shipping address on the order — nothing to promote. */
  | "no-address"
  /** Order has no email to key the chart by. */
  | "no-email"
  /** The chart already carried an address; nothing was overwritten. */
  | "already-addressed"
  /** Address written onto an existing chart. */
  | "filled"
  /** Chart minted for this buyer, carrying the address. */
  | "created";

/**
 * A chart counts as "already addressed" when it has a street line OR a city.
 * Either alone is enough to make it someone's deliberate entry, and filling the
 * gaps from a shipping label would splice two different addresses into one row.
 */
function hasAddress(p: { addressLine1: string | null; addressCity: string | null }): boolean {
  return Boolean(p.addressLine1?.trim() || p.addressCity?.trim());
}

export async function saveOrderShippingAddressToProfile(
  db: ProfileDb,
  order: OrderShippingProfileInput,
): Promise<OrderShippingProfileOutcome> {
  const email = order.email?.trim().toLowerCase();
  if (!email) return "no-email";

  const line1 = order.shipLine1?.trim() || null;
  const city = order.shipCity?.trim() || null;
  // A postal code on its own is not an address. Require the parts a courier
  // (and a prescription PDF) actually needs before touching the chart.
  if (!line1 || !city) return "no-address";

  const address = {
    addressLine1: line1,
    addressLine2: order.shipLine2?.trim() || null,
    addressCity: city,
    addressPostalCode: order.shipPostalCode?.trim() || null,
    // Country codes are stored lowercase everywhere else in the chart; the
    // ship column holds the ISO code uppercased at checkout.
    addressCountryCode: order.shipCountryCode?.trim().toLowerCase() || null,
  };

  const existing = await db.patientProfile.findUnique({
    where: { email },
    select: { id: true, userId: true, addressLine1: true, addressCity: true },
  });

  if (existing && hasAddress(existing)) {
    await linkAccount(db, existing, order.userId);
    return "already-addressed";
  }

  await db.patientProfile.upsert({
    where: { email },
    update: address,
    create: {
      email,
      // `shipName` is the recipient, which on a self-bought kit is the buyer;
      // the account name is the better identity when both are present.
      fullName: order.fullName?.trim() || order.shipName?.trim() || null,
      phone: order.phone?.trim() || null,
      ...address,
    } satisfies Prisma.PatientProfileCreateInput,
  });

  const after = existing
    ? existing
    : await db.patientProfile.findUnique({
        where: { email },
        select: { id: true, userId: true, addressLine1: true, addressCity: true },
      });
  if (after) await linkAccount(db, after, order.userId);

  return existing ? "filled" : "created";
}

/**
 * Point a freshly-minted or still-unowned chart at the ordering account.
 *
 * `userId: null` in the predicate is load-bearing (same reasoning as
 * `linkPatientProfileToUserByEmail`): this claims an UNOWNED chart, it never
 * moves one that already belongs to somebody else.
 */
async function linkAccount(
  db: ProfileDb,
  profile: { id: string; userId: string | null },
  userId: string | null,
): Promise<void> {
  if (!userId || profile.userId) return;
  await db.patientProfile
    .updateMany({ where: { id: profile.id, userId: null }, data: { userId } })
    // `PatientProfile.userId` is unique — the account may already hold a
    // different chart, which is a merge decision for a human, not a reason to
    // fail a paid order's post-payment work.
    .catch(() => undefined);
}
