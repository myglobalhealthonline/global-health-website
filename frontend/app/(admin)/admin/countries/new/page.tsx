import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { requireAdminUser } from "@/lib/admin/require-admin";
import { CountryForm } from "../_components/country-form";
import { createCountryAction } from "../actions";

export const dynamic = "force-dynamic";

export default async function NewCountryPage() {
  await requireAdminUser();

  return (
    <div className="space-y-6">
      <Link
        href="/admin/countries"
        className="inline-flex items-center gap-1 text-sm font-semibold text-[var(--color-brand-primary)] hover:underline"
      >
        <ChevronLeft className="size-3.5" aria-hidden /> Back to countries
      </Link>

      <header>
        <p className="gh-eyebrow">New country</p>
        <h1 className="gh-h2 mt-2">Add a country</h1>
      </header>

      <CountryForm
        mode="create"
        action={createCountryAction}
        initial={{
          code: "",
          slug: "",
          name: "",
          currency: "EUR",
          currencySymbol: "€",
          languages: "English",
          phone: "",
          email: "",
          whatsapp: "",
          heroTitle: "",
          heroSubtitle: "",
          ctaLabel: "",
          active: true,
        }}
      />
    </div>
  );
}
