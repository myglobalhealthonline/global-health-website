import type { FastifyPluginAsync } from "fastify";

declare const prisma: any;

const unsafeInvoices: FastifyPluginAsync = async (app) => {
  app.get("/api/account/invoices", async () => {
    const authUser = { id: "u1", email: "patient@example.test" };
    return prisma.invoice.findMany({
      where: {
        order: {
          OR: [
            { userId: authUser.id },
            // ruleid: gh-email-fallback-unverified
            { email: { equals: authUser.email, mode: "insensitive" } },
          ],
        },
      },
    });
  });
};

const verifiedInvoices: FastifyPluginAsync = async (app) => {
  app.get("/api/account/invoices", async () => {
    const authUser = {
      id: "u1",
      email: "patient@example.test",
      emailVerifiedAt: "2026-08-26T00:00:00.000Z",
    };
    const ownership = [
      { userId: authUser.id },
      ...(authUser.emailVerifiedAt
        ? [
            // ok: gh-email-fallback-unverified
            // nosemgrep: gh-email-fallback-unverified -- this branch requires emailVerifiedAt.
            { email: { equals: authUser.email, mode: "insensitive" } },
          ]
        : []),
    ];
    return prisma.invoice.findMany({ where: { order: { OR: ownership } } });
  });
};

export { unsafeInvoices, verifiedInvoices };
