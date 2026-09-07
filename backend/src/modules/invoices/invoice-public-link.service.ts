import { timingSafeEqual } from "node:crypto";
import { prisma } from "../../db/prisma.js";
import {
  generateCapabilityNonce,
  signPublicCapability,
  verifyPublicCapability,
} from "../../utils/public-capability.js";

const INVOICE_PUBLIC_CAPABILITY_TTL = "365d";

async function getOrCreateInvoiceNonce(invoiceId: string): Promise<string | null> {
  const existing = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    select: { publicAccessNonce: true },
  });
  if (!existing) return null;
  if (existing.publicAccessNonce) return existing.publicAccessNonce;

  const nonce = generateCapabilityNonce();
  const claimed = await prisma.invoice.updateMany({
    where: { id: invoiceId, publicAccessNonce: null },
    data: { publicAccessNonce: nonce },
  });
  if (claimed.count > 0) return nonce;

  const current = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    select: { publicAccessNonce: true },
  });
  return current?.publicAccessNonce ?? null;
}

export async function issueInvoicePublicCapability(invoiceId: string): Promise<string | null> {
  const nonce = await getOrCreateInvoiceNonce(invoiceId);
  if (!nonce) return null;
  return signPublicCapability(
    { sub: invoiceId, purpose: "invoice-public", nonce },
    INVOICE_PUBLIC_CAPABILITY_TTL,
  );
}

/**
 * Short form of the same capability: the row's `publicAccessNonce` handed over
 * raw as `?t=`.
 *
 * The signed JWT above is ~600 characters, which is what turned the emailed
 * invoice link into ten wrapped lines of base64 in the patient's inbox. The
 * signature was never the thing protecting the document — verification always
 * required the nonce to still match the row, so the nonce (18 random bytes,
 * 144 bits) is the credential and the envelope around it was pure length.
 *
 * Revocation is unchanged: null or rotate `publicAccessNonce` and every link
 * ever issued for that invoice dies. What is lost versus the JWT is the 365-day
 * expiry — a short link stays valid until the nonce is rotated.
 */
export async function issueInvoiceShortCapability(invoiceId: string): Promise<string | null> {
  return getOrCreateInvoiceNonce(invoiceId);
}

function nonceMatches(stored: string, presented: string): boolean {
  const a = Buffer.from(stored, "utf8");
  const b = Buffer.from(presented, "utf8");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/**
 * Accepts either form: the short raw nonce issued today, or the signed JWT that
 * older emails and WhatsApp messages still carry.
 *
 * The nonce is compared first and the signed path is the fallback, rather than
 * sniffing the token's shape — a shape test would have to encode what a JWT
 * looks like in two places and get both right forever.
 */
export async function verifyInvoicePublicCapability(
  invoiceId: string,
  token: string | undefined,
): Promise<boolean> {
  if (!token) return false;

  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    select: { publicAccessNonce: true },
  });
  const storedNonce = invoice?.publicAccessNonce;
  if (!storedNonce) return false;

  if (nonceMatches(storedNonce, token)) return true;

  const payload = verifyPublicCapability(token, "invoice-public");
  if (!payload || payload.sub !== invoiceId) return false;
  return payload.nonce === storedNonce;
}
