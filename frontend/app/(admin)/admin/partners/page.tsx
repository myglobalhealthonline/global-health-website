import Link from "next/link";
import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdminAction } from "@/lib/admin/require-admin-action";
import {
  createAdminPartner,
  deleteAdminPartner,
  fetchAdminAuthorityLinks,
  fetchAdminCountries,
  fetchAdminPartners,
  updateAdminPartner,
} from "@/lib/admin/admin-api";
import { getActiveCountry } from "@/lib/admin/admin-scope";
import { AdminCard, PageHeader } from "../_components/atoms";
import { FlagBadge } from "../_components/flag-badge";
import { PartnersManager } from "./_components/partners-manager";
import { AuthorityLinksManager } from "../countries/[id]/legal/_authority-links-manager";

export const dynamic = "force-dynamic";

/**
 * Per-country "Certifications & partners" manager. Country is chosen from the
 * admin topbar; two tabs: Certifications (regulatory authority links) and
 * Partners & clients (logos + type label). Both drive the matching sections on
 * the country's public home page.
 */
type Search = { tab?: string; success?: string; error?: string };

export default async function AdminTrustPartnersPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const sp = await searchParams;
  const tab = sp.tab === "certifications" ? "certifications" : "partners";

  const countriesRes = await fetchAdminCountries();
  const countries = countriesRes.ok ? countriesRes.data.countries : [];
  const active = await getActiveCountry(countries);

  if (!active) {
    return (
      <>
        <PageHeader
          eyebrow="Country · Trust & partners"
          title="Certifications & partners"
          description="Pick a country from the topbar to manage its certifications and partners."
        />
        <AdminCard>
          <p className="text-sm text-[var(--color-text-muted)]">
            Each country owns its own regulatory certifications and partner / client
            logos. Pick a country first.
          </p>
        </AdminCard>
      </>
    );
  }

  const [partnersRes, authorityRes] = await Promise.all([
    fetchAdminPartners(active.id),
    fetchAdminAuthorityLinks(active.id),
  ]);
  const partners = partnersRes.ok ? partnersRes.data.partners : [];
  const authorityLinks = authorityRes.ok ? authorityRes.data.authorityLinks : [];

  function bust() {
    revalidatePath("/admin/partners");
    revalidateTag(`country-partners:${active!.code.toLowerCase()}`, "max");
  }

  function readBody(formData: FormData) {
    return {
      name: String(formData.get("name") ?? "").trim(),
      websiteUrl: String(formData.get("websiteUrl") ?? "").trim() || null,
      type: String(formData.get("type") ?? "").trim() || null,
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
      redirect(`/admin/partners?tab=partners&error=${encodeURIComponent("Name is required")}`);
    }
    const res = await createAdminPartner({ countryId: active!.id, ...body });
    if (!res.ok) redirect(`/admin/partners?tab=partners&error=${encodeURIComponent(res.message)}`);
    bust();
    redirect(`/admin/partners?tab=partners&success=${encodeURIComponent("Saved")}`);
  }

  async function updatePartnerAction(formData: FormData) {
    "use server";
    await requireAdminAction();
    const id = String(formData.get("id") ?? "");
    const body = readBody(formData);
    if (!id || !body.name) {
      redirect(`/admin/partners?tab=partners&error=${encodeURIComponent("Name is required")}`);
    }
    const res = await updateAdminPartner(id, body);
    if (!res.ok) redirect(`/admin/partners?tab=partners&error=${encodeURIComponent(res.message)}`);
    bust();
    redirect(`/admin/partners?tab=partners&success=${encodeURIComponent("Saved")}`);
  }

  async function deletePartnerAction(formData: FormData) {
    "use server";
    await requireAdminAction();
    const id = String(formData.get("id") ?? "");
    if (id) {
      const res = await deleteAdminPartner(id);
      if (!res.ok) redirect(`/admin/partners?tab=partners&error=${encodeURIComponent(res.message)}`);
    }
    bust();
    redirect(`/admin/partners?tab=partners&success=${encodeURIComponent("Removed")}`);
  }

  return (
    <>
      <PageHeader
        eyebrow={
          <span className="inline-flex items-center gap-2">
            <FlagBadge code={active.slug} size={14} />
            {active.code.toUpperCase()} · Trust &amp; partners
          </span>
        }
        title="Certifications & partners"
        description="Per-country regulatory badges and partner / client logos shown on this country's home page."
      />

      {sp.error ? (
        <p className="gh-status-warning mb-4 rounded-[var(--radius-card-sm)] border px-4 py-3 text-sm">{sp.error}</p>
      ) : null}
      {sp.success ? (
        <p className="gh-status-success mb-4 rounded-[var(--radius-card-sm)] border px-4 py-3 text-sm">{sp.success}</p>
      ) : null}

      <div className="mb-5 flex gap-1 border-b border-[var(--color-border)]">
        <TabLink href="/admin/partners?tab=certifications" active={tab === "certifications"}>
          Certifications
        </TabLink>
        <TabLink href="/admin/partners?tab=partners" active={tab === "partners"}>
          Partners &amp; clients
        </TabLink>
      </div>

      {tab === "certifications" ? (
        <AuthorityLinksManager countryId={active.id} countryCode={active.code} rows={authorityLinks} />
      ) : (
        <PartnersManager
          partners={partners}
          createAction={createPartnerAction}
          updateAction={updatePartnerAction}
          deleteAction={deletePartnerAction}
        />
      )}
    </>
  );
}

function TabLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="-mb-px px-4 py-2 text-sm font-semibold transition-colors"
      style={{
        color: active ? "var(--color-text-primary)" : "var(--color-text-muted)",
        borderBottom: active ? "2px solid var(--color-brand-primary)" : "2px solid transparent",
      }}
    >
      {children}
    </Link>
  );
}
