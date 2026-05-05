import { prisma } from "../../db/prisma.js";
import { normalizeDbError } from "../shared/db-errors.js";

export async function listDoctors() {
  try {
    return await prisma.doctor.findMany({
      where: { active: true },
      orderBy: [{ country: { name: "asc" } }, { fullName: "asc" }],
      include: {
        country: true,
        specialties: {
          include: {
            specialty: true,
          },
        },
        assets: true,
      },
    });
  } catch (error) {
    throw normalizeDbError(error, "Doctors data is unavailable");
  }
}
