import { prisma, disconnectDb } from "../src/db/prisma";

const FIXES: Record<string, { expected: string; next: string }> = {
  "cmrij9reg000078juaikntcgd": { expected: "/ireland/en/book-online", next: "/ireland/en/book" },
  "cmrij9xjc000878juunc9qo09": { expected: "/portugal/pt/book-online", next: "/portugal/pt/book" },
};

async function main() {
  for (const [id, { expected, next }] of Object.entries(FIXES)) {
    const before = await prisma.pageContent.findUniqueOrThrow({ where: { id } });
    if (before.ctaHref !== expected) {
      throw new Error(`${id} ctaHref changed since the read-only check (now ${before.ctaHref}) — aborting`);
    }
    const after = await prisma.pageContent.update({ where: { id }, data: { ctaHref: next } });
    console.log(`${after.id}: ${before.ctaHref} -> ${after.ctaHref}`);
  }
}

main().finally(() => disconnectDb());
