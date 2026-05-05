import { prisma } from "../../db/prisma.js";
import { normalizeDbError } from "../shared/db-errors.js";

export async function listServices() {
  try {
    return await prisma.service.findMany({
      where: { isActive: true },
      orderBy: [{ country: { name: "asc" } }, { name: "asc" }],
      include: {
        country: true,
        specialty: true,
      },
    });
  } catch (error) {
    throw normalizeDbError(error, "Services data is unavailable");
  }
}
