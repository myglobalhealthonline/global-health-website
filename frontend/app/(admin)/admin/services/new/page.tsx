import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { prisma } from "backend";
import { requireAdminUser } from "@/lib/admin/require-admin";
import { ServiceForm } from "../_components/service-form";
import { createServiceAction } from "../actions";

export const dynamic = "force-dynamic";

export default async function NewServicePage() {
  await requireAdminUser();
  const [countries, categories] = await Promise.all([
    prisma.country.findMany({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { id: true, code: true, name: true, currency: true },
    }),
    prisma.category.findMany({
      orderBy: [{ type: "asc" }, { name: "asc" }],
      select: { id: true, name: true, type: true },
    }),
  ]);

  return (
    <div className="space-y-6">
      <Link
        href="/admin/services"
        className="inline-flex items-center gap-1 text-sm font-semibold text-[var(--color-brand-primary)] hover:underline"
      >
        <ChevronLeft className="size-3.5" aria-hidden /> Back to services
      </Link>
      <header>
        <p className="gh-eyebrow">New service</p>
        <h1 className="gh-h2 mt-2">Add a service</h1>
      </header>
      <ServiceForm
        mode="create"
        countries={countries}
        categories={categories}
        action={createServiceAction}
        initial={{
          slug: "",
          title: "",
          summary: "",
          description: "",
          type: "GENERAL",
          countryId: countries[0]?.id ?? "",
          categoryId: "",
          priceCents: null,
          currency: "",
          durationMin: "",
          imageUrl: "",
          metaTitle: "",
          metaDescription: "",
          active: true,
          featured: false,
        }}
      />
    </div>
  );
}
