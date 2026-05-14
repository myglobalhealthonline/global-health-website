/**
 * Admin Countries endpoints — /api/v1/admin/countries
 *
 * Anchor pattern for every other entity. Copy this file, swap the model,
 * keep the structure identical.
 *
 * Shape:
 *   GET    /api/v1/admin/countries              list (filter + paginate)
 *   GET    /api/v1/admin/countries/:id          single
 *   POST   /api/v1/admin/countries              create
 *   PATCH  /api/v1/admin/countries/:id          partial update
 *   DELETE /api/v1/admin/countries/:id          deactivate (soft delete)
 */

import type { IncomingMessage, ServerResponse } from "node:http";
import { Prisma } from "@prisma/client";
import {
  countryCreateSchema,
  countryListQuerySchema,
  countryUpdateSchema,
  type CountryDTO,
} from "@gh/shared/schemas/countries";
import { prisma } from "../../index.js";
import { writeAudit } from "../../../lib/audit/log.js";
import { requireAdmin } from "../../http/auth.js";
import {
  sendConflict,
  sendNotFound,
  sendOk,
  sendValidation,
} from "../../http/envelope.js";
import { readJson } from "../../http/json.js";

type Country = Prisma.CountryGetPayload<{
  include: { _count: { select: { services: true; doctorLinks: true; categoryLinks: true } } };
}>;

function toDto(c: Country): CountryDTO {
  return {
    id: c.id,
    code: c.code,
    slug: c.slug,
    name: c.name,
    flagUrl: c.flagUrl,
    currency: c.currency,
    currencySymbol: c.currencySymbol,
    languages: c.languages,
    phone: c.phone,
    email: c.email,
    whatsapp: c.whatsapp,
    heroTitle: c.heroTitle,
    heroSubtitle: c.heroSubtitle,
    ctaLabel: c.ctaLabel,
    status: c.status,
    active: c.active,
    sortOrder: c.sortOrder,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
    counts: {
      services: c._count.services,
      doctorLinks: c._count.doctorLinks,
      categoryLinks: c._count.categoryLinks,
    },
  };
}

const REVALIDATE_LIST = ["/admin/countries"];
const revalidateOne = (id: string) => [...REVALIDATE_LIST, `/admin/countries/${id}`];

function fieldErrorsFromZod<T extends { flatten(): { fieldErrors: Record<string, string[] | undefined> } }>(
  err: T,
): Record<string, string[]> {
  const fields = err.flatten().fieldErrors;
  const out: Record<string, string[]> = {};
  for (const [k, v] of Object.entries(fields)) {
    if (v && v.length) out[k] = v;
  }
  return out;
}

export async function listCountries(req: IncomingMessage, res: ServerResponse, url: URL) {
  const session = await requireAdmin(req, res);
  if (!session) return;

  const queryObj: Record<string, string> = {};
  url.searchParams.forEach((v, k) => {
    queryObj[k] = v;
  });
  const parsed = countryListQuerySchema.safeParse(queryObj);
  if (!parsed.success) {
    sendValidation(res, fieldErrorsFromZod(parsed.error), "Invalid query");
    return;
  }
  const { q, status, active, page, limit } = parsed.data;

  const where: Prisma.CountryWhereInput = {
    ...(status ? { status } : {}),
    ...(typeof active === "boolean" ? { active } : {}),
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { code: { contains: q, mode: "insensitive" } },
            { slug: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [items, total] = await Promise.all([
    prisma.country.findMany({
      where,
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      skip: (page - 1) * limit,
      take: limit,
      include: {
        _count: { select: { services: true, doctorLinks: true, categoryLinks: true } },
      },
    }),
    prisma.country.count({ where }),
  ]);

  sendOk(res, {
    items: items.map(toDto),
    page,
    limit,
    total,
  });
}

export async function getCountry(req: IncomingMessage, res: ServerResponse, id: string) {
  const session = await requireAdmin(req, res);
  if (!session) return;

  const country = await prisma.country.findUnique({
    where: { id },
    include: {
      _count: { select: { services: true, doctorLinks: true, categoryLinks: true } },
    },
  });
  if (!country) {
    sendNotFound(res, "Country not found");
    return;
  }
  sendOk(res, toDto(country));
}

export async function createCountry(req: IncomingMessage, res: ServerResponse) {
  const session = await requireAdmin(req, res);
  if (!session) return;

  const body = await readJson(req);
  const parsed = countryCreateSchema.safeParse(body);
  if (!parsed.success) {
    sendValidation(res, fieldErrorsFromZod(parsed.error));
    return;
  }

  try {
    const created = await prisma.country.create({
      data: parsed.data,
      include: {
        _count: { select: { services: true, doctorLinks: true, categoryLinks: true } },
      },
    });
    await writeAudit({
      userId: session.sub,
      action: "country.create",
      entity: "Country",
      entityId: created.id,
      metadata: { slug: created.slug, status: created.status },
    });
    sendOk(res, toDto(created), { status: 201, revalidate: REVALIDATE_LIST });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      sendConflict(res, "A country with that code or slug already exists.");
      return;
    }
    throw err;
  }
}

export async function updateCountry(req: IncomingMessage, res: ServerResponse, id: string) {
  const session = await requireAdmin(req, res);
  if (!session) return;

  const body = await readJson(req);
  const parsed = countryUpdateSchema.safeParse(body);
  if (!parsed.success) {
    sendValidation(res, fieldErrorsFromZod(parsed.error));
    return;
  }

  try {
    const updated = await prisma.country.update({
      where: { id },
      data: parsed.data,
      include: {
        _count: { select: { services: true, doctorLinks: true, categoryLinks: true } },
      },
    });
    await writeAudit({
      userId: session.sub,
      action: "country.update",
      entity: "Country",
      entityId: updated.id,
      metadata: { slug: updated.slug, status: updated.status, changed: Object.keys(parsed.data) },
    });
    sendOk(res, toDto(updated), { revalidate: revalidateOne(id) });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      if (err.code === "P2025") {
        sendNotFound(res, "Country not found");
        return;
      }
      if (err.code === "P2002") {
        sendConflict(res, "A country with that code or slug already exists.");
        return;
      }
    }
    throw err;
  }
}

export async function deactivateCountry(req: IncomingMessage, res: ServerResponse, id: string) {
  const session = await requireAdmin(req, res);
  if (!session) return;

  try {
    const updated = await prisma.country.update({
      where: { id },
      data: { active: false },
      include: {
        _count: { select: { services: true, doctorLinks: true, categoryLinks: true } },
      },
    });
    await writeAudit({
      userId: session.sub,
      action: "country.deactivate",
      entity: "Country",
      entityId: updated.id,
      metadata: { slug: updated.slug },
    });
    sendOk(res, toDto(updated), { revalidate: revalidateOne(id) });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") {
      sendNotFound(res, "Country not found");
      return;
    }
    throw err;
  }
}
