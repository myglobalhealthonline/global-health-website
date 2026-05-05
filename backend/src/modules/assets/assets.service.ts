import { prisma } from "../../db/prisma.js";
import { normalizeDbError } from "../shared/db-errors.js";

export async function listAssets() {
  try {
    return await prisma.asset.findMany({
      orderBy: [{ kind: "asc" }, { key: "asc" }],
      include: {
        country: true,
        doctor: true,
      },
    });
  } catch (error) {
    throw normalizeDbError(error, "Assets data is unavailable");
  }
}
