import { prisma } from "../../db/prisma.js";
import { normalizeDbError } from "../shared/db-errors.js";

export async function listCountries() {
  try {
    return await prisma.country.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      include: {
        currency: true,
        countryLocales: {
          orderBy: { locale: "asc" },
        },
      },
    });
  } catch (error) {
    throw normalizeDbError(error, "Countries data is unavailable");
  }
}
