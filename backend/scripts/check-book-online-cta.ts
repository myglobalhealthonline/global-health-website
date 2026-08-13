import { prisma, disconnectDb } from "../src/db/prisma";

async function main() {
  const rows = await prisma.pageContent.findMany({
    where: { pageKey: "HOME", ctaHref: { contains: "book-online" } },
    include: { country: { select: { code: true, name: true } } },
  });
  console.log(JSON.stringify(rows.map((r) => ({
    id: r.id,
    country: r.country.code,
    pageKey: r.pageKey,
    ctaHref: r.ctaHref,
    status: r.status,
    isActive: r.isActive,
  })), null, 2));
}

main().finally(() => disconnectDb());
