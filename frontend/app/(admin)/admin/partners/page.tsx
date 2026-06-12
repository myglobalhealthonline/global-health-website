import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdminAction } from "@/lib/admin/require-admin-action";
import {
  createAdminPartner,
  deleteAdminPartner,
  fetchAdminCountries,
  fetchAdminPartners,
  updateAdminPartner,
} from "@/lib/admin/admin-api";
import { getActiveCountry } from "@/lib/admin/admin-scope";
import { AdminCard, PageHeader } from "../_components/atoms";
import { FlagBadge } from "../_components/flag-badge";
import { PartnersManager } from "./_components/partners-manager";

export const dynamic = "force-dynamic";

/**
 * Per-country partners admin. Country-scoped — admin picks a country from the
 * topbar; this page manages that country's "Our partners" marquee entries.
 */
export default async function AdminPartnersPage() {
  const countriesRes = await fetchAdminCountries();
  const countries = countriesRes.ok ? countriesRes.data.countries : [];
  const active = await getActiveCountry(countries);

  if (!active) {
    return (
      <>
        <PageHeader
          eyebrow="Country · Partners"
          title="Partners"
          description="Pick a country from the topbar to manage its partners."
        />
        <AdminCard>
          <p className="text-sm text-[var(--color-text-muted)]">
            Each country owns its partner list — the logos shown in the “Our
            partners” marquee on its home page. Pick a country first.
          </p>
        </AdminCard>
      </>
    );
  }

  const partnersRes = await fetchAdminPartners(active.id);
  const partners = partnersRes.ok ? partnersRes.data.partners : [];

  function bust() {
    revalidatePath("/admin/partners");
    revalidateTag(`country-partners:${active!.code.toLowerCase()}`, "max");
  }

  function readBody(formData: FormData) {
    return {
      name: String(formData.get("name") ?? "").trim(),
      websiteUrl: String(formData.get("websiteUrl") ?? "").trim() || null,
      logoImagePath: String(formData.get("logoImagePath") ?? "").trim() || null,
      sortOrder: Number(formData.get("sortOrder") ?? 0) || 0,
      active: formData.get("active") === "on",
    };
  }

  async function createPartnerAction(formData: FormData) {
    "use server";
    await requireAdminAction();
    const body = readBody(formData);
    if (!body.name) {
      redirect(`/admin/partners?error=${encodeURIComponent("Partner name is required")}`);
    }
    const res = await createAdminPartner({ countryId: active!.id, ...body });
    if (!res.ok) redirect(`/admin/partners?error=${encodeURIComponent(res.message)}`);
    bust();
    redirect(`/admin/partners?success=${encodeURIComponent("Partner added")}`);
  }

  async function updatePartnerAction(formData: FormData) {
    "use server";
    await requireAdminAction();
    const id = String(formData.get("id") ?? "");
    const body = readBody(formData);
    if (!id || !body.name) {
      redirect(`/admin/partners?error=${encodeURIComponent("Partner name is required")}`);
    }
    const res = await updateAdminPartner(id, body);
    if (!res.ok) redirect(`/admin/partners?error=${encodeURIComponent(res.message)}`);
    bust();
    redirect(`/admin/partners?success=${encodeURIComponent("Partner saved")}`);
  }

  async function deletePartnerAction(formData: FormData) {
    "use server";
    await requireAdminAction();
    const id = String(formData.get("id") ?? "");
    if (id) {
      const res = await deleteAdminPartner(id);
      if (!res.ok) redirect(`/admin/partners?error=${encodeURIComponent(res.message)}`);
    }
    bust();
    redirect(`/admin/partners?success=${encodeURIComponent("Partner removed")}`);
  }

  return (
    <>
      <PageHeader
        eyebrow="Country · Partners"
        title="Partners"
        description="Logos shown in the “Our partners” marquee on this country’s home page."
        actions={<FlagBadge code={active.slug} />}
      />
      <PartnersManager
        partners={partners}
        createAction={createPartnerAction}
        updateAction={updatePartnerAction}
        deleteAction={deletePartnerAction}
      />
    </>
  );
}
