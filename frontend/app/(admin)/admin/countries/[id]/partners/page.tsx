import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdminAction } from "@/lib/admin/require-admin-action";
import {
  createAdminPartner,
  deleteAdminPartner,
  fetchAdminCountryById,
  fetchAdminPartners,
  updateAdminPartner,
} from "@/lib/admin/admin-api";
import { AdminCard, PageHeader } from "../../../_components/atoms";
import { FlagBadge } from "../../../_components/flag-badge";
import { PartnersManager } from "../../../partners/_components/partners-manager";

export const dynamic = "force-dynamic";

/**
 * Per-country partners — managed inside the country admin (next to Legal /
 * Authority links) rather than a separate top-level section, since partners are
 * country-scoped. Country comes from the route id (not the topbar picker).
 */
type PageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ success?: string; error?: string }>;
};

export default async function CountryPartnersPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const sp = searchParams ? await searchParams : {};

  const countryRes = await fetchAdminCountryById(id);
  if (!countryRes.ok) {
    return (
      <>
        <PageHeader eyebrow="Country" title="Partners" />
        <AdminCard>
          <p className="gh-status-warning rounded-[var(--radius-card-sm)] border px-4 py-3 text-sm">
            {countryRes.message}
          </p>
        </AdminCard>
      </>
    );
  }
  const c = countryRes.data.country;

  const partnersRes = await fetchAdminPartners(id);
  const partners = partnersRes.ok ? partnersRes.data.partners : [];

  function bust() {
    revalidatePath(`/admin/countries/${id}/partners`);
    revalidateTag(`country-partners:${c.code.toLowerCase()}`, "max");
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
      redirect(`/admin/countries/${id}/partners?error=${encodeURIComponent("Partner name is required")}`);
    }
    const res = await createAdminPartner({ countryId: id, ...body });
    if (!res.ok) redirect(`/admin/countries/${id}/partners?error=${encodeURIComponent(res.message)}`);
    bust();
    redirect(`/admin/countries/${id}/partners?success=${encodeURIComponent("Partner added")}`);
  }

  async function updatePartnerAction(formData: FormData) {
    "use server";
    await requireAdminAction();
    const partnerId = String(formData.get("id") ?? "");
    const body = readBody(formData);
    if (!partnerId || !body.name) {
      redirect(`/admin/countries/${id}/partners?error=${encodeURIComponent("Partner name is required")}`);
    }
    const res = await updateAdminPartner(partnerId, body);
    if (!res.ok) redirect(`/admin/countries/${id}/partners?error=${encodeURIComponent(res.message)}`);
    bust();
    redirect(`/admin/countries/${id}/partners?success=${encodeURIComponent("Partner saved")}`);
  }

  async function deletePartnerAction(formData: FormData) {
    "use server";
    await requireAdminAction();
    const partnerId = String(formData.get("id") ?? "");
    if (partnerId) {
      const res = await deleteAdminPartner(partnerId);
      if (!res.ok) redirect(`/admin/countries/${id}/partners?error=${encodeURIComponent(res.message)}`);
    }
    bust();
    redirect(`/admin/countries/${id}/partners?success=${encodeURIComponent("Partner removed")}`);
  }

  return (
    <>
      <Link
        href={`/admin/countries/${id}`}
        className="mb-4 inline-flex items-center gap-1.5 text-[13px] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
      >
        <ArrowLeft className="size-3.5" />
        Back to {c.name}
      </Link>

      <PageHeader
        eyebrow={
          <span className="inline-flex items-center gap-2">
            <FlagBadge code={c.code} size={14} />
            {c.name}
          </span>
        }
        title="Partners & clients"
        description="Logos shown in the “Accredited & partners” section on this country’s home page."
      />

      {sp.error ? (
        <p className="gh-status-warning mb-4 rounded-[var(--radius-card-sm)] border px-4 py-3 text-sm">{sp.error}</p>
      ) : null}
      {sp.success ? (
        <p className="gh-status-success mb-4 rounded-[var(--radius-card-sm)] border px-4 py-3 text-sm">{sp.success}</p>
      ) : null}

      <PartnersManager
        partners={partners}
        createAction={createPartnerAction}
        updateAction={updatePartnerAction}
        deleteAction={deletePartnerAction}
      />
    </>
  );
}
