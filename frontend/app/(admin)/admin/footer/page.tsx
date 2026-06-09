import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import {
  fetchAdminCountries,
  fetchAdminCountryFooter,
  putAdminCountryFooter,
} from "@/lib/admin/admin-api";
import { getActiveCountry } from "@/lib/admin/admin-scope";
import { AdminCard, Btn, PageHeader } from "../_components/atoms";
import { FlagBadge } from "../_components/flag-badge";
import { FooterEditor } from "./_components/footer-editor";

/**
 * Per-country footer editor.
 *
 * Country-scoped — admin picks a country from the topbar (cookie-backed)
 * and this page edits that country's footer row. Outside a country
 * scope it shows a hint to pick one from the topbar.
 *
 * The form lives in a client component (`FooterEditor`); this page
 * resolves the active country and current footer server-side then hands
 * the prefill + the server action to the client.
 */
export const dynamic = "force-dynamic";

export default async function AdminFooterPage({
  searchParams,
}: {
  searchParams?: Promise<{ saved?: string; error?: string }>;
}) {
  const sp = searchParams ? await searchParams : {};
  const countriesRes = await fetchAdminCountries();
  const countries = countriesRes.ok ? countriesRes.data.countries : [];
  const active = await getActiveCountry(countries);

  if (!active) {
    return (
      <>
        <PageHeader
          eyebrow="Country · Footer"
          title="Per-country footer"
          description="Pick a country from the topbar to edit its footer."
        />
        <AdminCard>
          <p className="text-sm text-[var(--color-text-muted)]">
            Each country owns its footer content — tagline, contact block,
            social links, copyright line, and any custom link columns.
            Pick a country first.
          </p>
        </AdminCard>
      </>
    );
  }

  const footerRes = await fetchAdminCountryFooter(active.id);
  const initialFooter =
    footerRes.ok && footerRes.data.footer ? footerRes.data.footer : null;

  async function saveFooterAction(formData: FormData) {
    "use server";
    const raw = String(formData.get("payload") ?? "");
    let body: unknown;
    try {
      body = JSON.parse(raw);
    } catch {
      redirect(`/admin/footer?error=${encodeURIComponent("Invalid form data")}`);
    }
    const res = await putAdminCountryFooter(active!.id, body);
    if (!res.ok) {
      redirect(`/admin/footer?error=${encodeURIComponent(res.message)}`);
    }
    // Bust the public site cache so the next render of any country page
    // picks up the new footer immediately.
    // revalidateTag busts the fetch-level tag cache; revalidatePath busts
    // the RSC cache so the layout re-runs on the next request.
    revalidateTag(`country-footer:${active!.code.toLowerCase()}`, "max");
    revalidatePath(`/${active!.slug}`, "layout");
    redirect("/admin/footer?saved=1");
  }

  return (
    <>
      <PageHeader
        eyebrow={
          <span className="inline-flex items-center gap-2">
            <FlagBadge code={active.slug} size={14} />
            <span>Country · Footer</span>
          </span>
        }
        title={`${active.name} footer`}
        description="Tagline, contact details, social links, custom columns and copyright. Care + Clinics columns stay auto-derived from country features."
        actions={
          <Btn href="/" variant="secondary" size="md">
            View site
          </Btn>
        }
      />

      {sp?.saved ? (
        <div className="mb-4 rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-800">
          Footer saved.
        </div>
      ) : null}
      {sp?.error ? (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">
          {sp.error}
        </div>
      ) : null}

      <FooterEditor
        initial={initialFooter}
        saveAction={saveFooterAction}
      />
    </>
  );
}
