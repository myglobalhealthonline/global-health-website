import type { FastifyPluginAsync } from "fastify";

declare const prisma: any;
declare function buildInvoiceDetailPayload(id: string): unknown;
declare function resolveOrderPaymentUrl(id: string): unknown;
declare function verifyInvoicePublicCapability(id: string, token: string): Promise<boolean>;
declare function verifyOrderPayCapability(token: string): Promise<string | null>;

const unsafeInvoices: FastifyPluginAsync = async (app) => {
  app.get("/api/public/invoices/:invoiceId", async (request) => {
    const params = { invoiceId: request.params.invoiceId };
    // ruleid: gh-public-raw-id-capability
    buildInvoiceDetailPayload(params.invoiceId);

    // ruleid: gh-public-raw-id-capability
    return prisma.invoice.findUnique({
      where: { id: params.invoiceId },
      select: { orderId: true },
    });
  });
};

const unsafePayment: FastifyPluginAsync = async (app) => {
  app.get("/api/orders/:id/pay-url", async (request) => {
    const params = { data: { id: request.params.id } };
    // ruleid: gh-public-raw-id-capability
    return resolveOrderPaymentUrl(params.data.id);
  });
};

const securedInvoice: FastifyPluginAsync = async (app) => {
  app.get("/api/public/invoices/:invoiceId", async (request) => {
    const params = { invoiceId: request.params.invoiceId };
    const allowed = await verifyInvoicePublicCapability(params.invoiceId, request.query.token);
    if (!allowed) return null;
    // ok: gh-public-raw-id-capability
    // nosemgrep: gh-public-raw-id-capability -- checked above for this exact invoice id.
    return buildInvoiceDetailPayload(params.invoiceId);
  });
};

const securedPayment: FastifyPluginAsync = async (app) => {
  app.get("/api/orders/:id/pay-url", async (request) => {
    const orderId = await verifyOrderPayCapability(request.query.token);
    if (!orderId) return null;
    // ok: gh-public-raw-id-capability
    return resolveOrderPaymentUrl(orderId);
  });
};

export { securedInvoice, securedPayment, unsafeInvoices, unsafePayment };
