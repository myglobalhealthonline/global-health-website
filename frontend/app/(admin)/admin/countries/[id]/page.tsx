import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { prisma } from "backend";
import { requireAdminUser } from "@/lib/admin/require-admin";
import { CountryForm } from "../_components/country-form";
import { updateCountryAction } from "../actions";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ id: string }> };

export default async function EditCountryPage({ params }: PageProps) {
  await requireAdminUser();
  const { id } = await params;

  const country = await prisma.country.findUnique({ where: { id } });
  if (!country) notFound();

  return (
    <div className="space-y-6">
      <Link
        href="/admin/countries"
        className="inline-flex items-center gap-1 text-sm font-semibold text-[var(--color-brand-primary)] hover:underline"
      >
        <ChevronLeft className="size-3.5" aria-hidden /> Back to countries
      </Link>

      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="gh-eyebrow">Edit country</p>
          <h1 className="gh-h2 mt-2">{country.name}</h1>
        </div>
        <span
          className={`gh-badge ${country.status === "PUBLISHED" ? "gh-badge-success" : "gh-badge-neutral"}`}
        >
          {country.status === "PUBLISHED" ? "Published" : "Draft"}
        </span>
      </header>

      <CountryForm
        mode="edit"
        action={updateCountryAction}
        initial={{
          id: country.id,
          code: country.code,
          slug: country.slug,
          name: country.name,
          currency: country.currency,
          currencySymbol: country.currencySymbol ?? "",
          languages: country.languages.join(", "),
          phone: country.phone ?? "",
          email: country.email ?? "",
          whatsapp: country.whatsapp ?? "",
          heroTitle: country.heroTitle ?? "",
          heroSubtitle: country.heroSubtitle ?? "",
          ctaLabel: country.ctaLabel ?? "",
          active: country.active,
          status: country.status,
        }}
      />
    </div>
  );
}
