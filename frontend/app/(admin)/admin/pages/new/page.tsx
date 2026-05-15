import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import {
  fetchAdminCountries,
  postAdminPage,
} from "@/lib/admin/admin-api";
import { AdminCard, Btn, PageHeader } from "../../_components/atoms";
import { PageFields } from "../_components/page-fields";
import { parsePageBody } from "../_components/page-form-parse";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: Promise<{ error?: string; countryId?: string }>;
};

export default async function AdminNewPagePage({ searchParams }: PageProps) {
  const messages = searchParams ? await searchParams : {};
  const countriesResult = await fetchAdminCountries();

  if (!countriesResult.ok) {
    return (
      <>
        <PageHeader
          eyebrow="Global"
          title="New page"
          actions={
            <Btn href="/admin/pages" variant="ghost" size="md" iconLeft={<ArrowLeft className="size-3.5" />}>
              Cancel
            </Btn>
          }
        />
        <AdminCard>
          <p className="gh-status-warning rounded-md border px-4 py-3 text-sm">
            Could not load countries: {countriesResult.message}
          </p>
        </AdminCard>
      </>
    );
  }

  const countries = countriesResult.data.countries;

  async function createPageAction(formData: FormData) {
    "use server";
    const body = parsePageBody(formData);
    const result = await postAdminPage(body);
    if (!result.ok) {
      redirect(`/admin/pages/new?error=${encodeURIComponent(result.message)}`);
    }
    redirect(`/admin/pages/${result.data.page.id}/edit?success=${encodeURIComponent("Page created")}`);
  }

  return (
    <>
      <Link
        href="/admin/pages"
        className="mb-2 inline-flex items-center gap-1.5 text-[13px] font-semibold text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
      >
        <ArrowLeft className="size-3.5" /> Back to pages
      </Link>
      <PageHeader
        eyebrow="Global"
        title="New page"
        description="Create a country-scoped page. Each (country, page type, locale) is unique."
      />

      {messages.error ? (
        <AdminCard>
          <p className="gh-status-warning rounded-md border px-4 py-3 text-sm">{messages.error}</p>
        </AdminCard>
      ) : null}

      <form action={createPageAction} className="mt-6 flex flex-col gap-6">
        <PageFields
          countries={countries}
          isCreate
          defaultCountryId={messages.countryId}
        />
        <div className="flex items-center justify-end gap-2">
          <Btn href="/admin/pages" variant="ghost" size="md">
            Cancel
          </Btn>
          <Btn type="submit" variant="primary" size="md">
            Create page
          </Btn>
        </div>
      </form>
    </>
  );
}
