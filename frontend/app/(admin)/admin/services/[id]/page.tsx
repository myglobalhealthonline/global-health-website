import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { prisma } from "backend";
import { requireAdminUser } from "@/lib/admin/require-admin";
import { ServiceForm } from "../_components/service-form";
import { deleteServiceAction, updateServiceAction } from "../actions";
import { LivePreview } from "../../_components/live-preview";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ id: string }> };

export default async function EditServicePage({ params }: PageProps) {
  await requireAdminUser();
  const { id } = await params;

  const [service, countries, categories] = await Promise.all([
    prisma.service.findUnique({ where: { id }, include: { country: true, category: true } }),
    prisma.country.findMany({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { id: true, code: true, name: true, currency: true },
    }),
    prisma.category.findMany({
      orderBy: [{ type: "asc" }, { name: "asc" }],
      select: { id: true, name: true, type: true },
    }),
  ]);
  if (!service) notFound();

  return (
    <div className="space-y-6">
      <Link
        href="/admin/services"
        className="inline-flex items-center gap-1 text-sm font-semibold text-[var(--color-brand-primary)] hover:underline"
      >
        <ChevronLeft className="size-3.5" aria-hidden /> Back to services
      </Link>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="gh-eyebrow">Edit service · {service.country.code}</p>
          <h1 className="gh-h2 mt-2">{service.title}</h1>
        </div>
        <form action={deleteServiceAction}>
          <input type="hidden" name="id" value={service.id} />
          <button type="submit" className="gh-btn gh-btn-danger text-sm">
            Deactivate
          </button>
        </form>
      </header>

      <LivePreview
        href={`/${service.country.slug}/services/${service.slug}`}
        label={`Service detail · ${service.country.code}`}
      />

      <ServiceForm
        mode="edit"
        countries={countries}
        categories={categories}
        action={updateServiceAction}
        initial={{
          id: service.id,
          slug: service.slug,
          title: service.title,
          summary: service.summary,
          description: service.description,
          type: service.type,
          countryId: service.countryId,
          categoryId: service.categoryId ?? "",
          priceCents: service.priceCents,
          currency: service.currency ?? "",
          durationMin: service.durationMin !== null ? String(service.durationMin) : "",
          imageUrl: service.imageUrl ?? "",
          metaTitle: service.metaTitle ?? "",
          metaDescription: service.metaDescription ?? "",
          active: service.active,
          featured: service.featured,
          status: service.status,
        }}
      />
    </div>
  );
}
