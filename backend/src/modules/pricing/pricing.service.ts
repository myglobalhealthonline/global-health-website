import { prisma } from "../../db/prisma.js";
import { normalizeDbError } from "../shared/db-errors.js";

export async function listPricing() {
  try {
    return await prisma.pricingPlan.findMany({
      where: { isActive: true },
      orderBy: [{ country: { name: "asc" } }, { priceCents: "asc" }],
      include: {
        country: true,
      },
    });
  } catch (error) {
    throw normalizeDbError(error, "Pricing data is unavailable");
  }
}
