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

export async function verifyInvoicePublicCapability(
  invoiceId: string,
  token: string | undefined,
): Promise<boolean> {
  if (!token) return false;
  const payload = verifyPublicCapability(token, "invoice-public");
  if (!payload || payload.sub !== invoiceId) return false;
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    select: { publicAccessNonce: true },
  });
  return Boolean(invoice?.publicAccessNonce && invoice.publicAccessNonce === payload.nonce);
}
