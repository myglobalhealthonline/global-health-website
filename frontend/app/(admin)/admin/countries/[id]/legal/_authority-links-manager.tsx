import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import { Trash2 } from "lucide-react";
import { countryLegalCacheTag } from "@/lib/content/get-country-legal";
import { requireAdminAction } from "@/lib/admin/require-admin-action";
import {
  type AdminAuthorityLinkDto,
  createAdminAuthorityLink,
  deleteAdminAuthorityLink,
  updateAdminAuthorityLink,
} from "@/lib/admin/admin-api";
import { AdminCard } from "../../../_components/atoms";

const CATEGORIES = [
  "MEDICAL_REGULATOR",
  "DOCTOR_REGISTRY",
  "HEALTH_AUTHORITY",
  "DATA_PROTECTION",
  "MEDICINES",
  "PROFESSIONAL_BODY",
  "CONSUMER_PROTECTION",
  "MENTAL_HEALTH",
  "COMPLAINTS",
  "EMERGENCY",
  "OTHER",
] as const;

/**
 * Manage a country's official authority links (IMC, ERS, OM, DPC, CNPD,
 * Livro de Reclamações…). `showInFooter` puts the link in the mandatory
 * footer trust bar; `showInSchema` includes it in Organization/MedicalBusiness
 * `sameAs`. Drives the footer trust bar + legal hub + JSON-LD authority signal.
 */
export function AuthorityLinksManager({
  countryId,
  countryCode,
  rows,
}: {
  countryId: string;
  countryCode: string;
  rows: AdminAuthorityLinkDto[];
}) {
  const base = `/admin/countries/${countryId}/legal`;

  function bust() {
    revalidatePath(base);
    revalidateTag(countryLegalCacheTag(countryCode), "max");
    revalidateTag(`country-trust:${countryCode.toLowerCase()}`, "max");
  }

  function readBody(formData: FormData) {
    return {
      name: String(formData.get("name") ?? "").trim(),
      abbreviation: String(formData.get("abbreviation") ?? "").trim() || null,
      url: String(formData.get("url") ?? "").trim(),
      category: String(formData.get("category") ?? "OTHER"),
      description: String(formData.get("description") ?? "").trim() || null,
      showInFooter: formData.get("showInFooter") === "on",
      showInSchema: formData.get("showInSchema") === "on",
      sortOrder: Number(formData.get("sortOrder") ?? 0) || 0,
    };
  }

  async function addLink(formData: FormData) {
    "use server";
    await requireAdminAction();
    const body = readBody(formData);
    if (!body.name || !body.url) {
      redirect(`${base}?error=${encodeURIComponent("Authority name and URL are required")}`);
    }
    const result = await createAdminAuthorityLink(countryId, body);
    if (!result.ok) redirect(`${base}?error=${encodeURIComponent(result.message)}`);
    bust();
    redirect(`${base}?success=${encodeURIComponent("Authority link added")}`);
  }

  async function editLink(formData: FormData) {
    "use server";
    await requireAdminAction();
    const linkId = String(formData.get("linkId") ?? "");
    const body = readBody(formData);
    if (!linkId || !body.name || !body.url) {
      redirect(`${base}?error=${encodeURIComponent("Authority name and URL are required")}`);
    }
    const result = await updateAdminAuthorityLink(countryId, linkId, body);
    if (!result.ok) redirect(`${base}?error=${encodeURIComponent(result.message)}`);
    bust();
    redirect(`${base}?success=${encodeURIComponent("Authority link saved")}`);
  }

  async function removeLink(formData: FormData) {
    "use server";
    await requireAdminAction();
    const linkId = String(formData.get("linkId") ?? "");
    if (linkId) {
      const result = await deleteAdminAuthorityLink(countryId, linkId);
      if (!result.ok) redirect(`${base}?error=${encodeURIComponent(result.message)}`);
    }
    bust();
    redirect(`${base}?success=${encodeURIComponent("Authority link removed")}`);
  }

  return (
    <AdminCard>
      <h3 style={cardTitleStyle}>Authority links</h3>
      <p className="mb-4 mt-1 text-[13px] text-[var(--color-text-muted)]">
        Official regulators / authorities for this market. “In footer” adds the
        link to the mandatory footer trust bar; “In schema” includes it in the
        page JSON-LD <code>sameAs</code>.
      </p>

      {rows.length > 0 ? (
        <div className="mb-4 grid gap-3">
          {rows.map((row) => (
            <form
              key={row.id}
              action={editLink}
              className="rounded-md border border-[var(--color-border)] bg-[var(--color-background-soft)] p-3"
            >
              <input type="hidden" name="linkId" value={row.id} />
              <LinkFields row={row} />
              <div className="mt-2 flex justify-end gap-2">
                <button
                  type="submit"
                  formAction={removeLink}
                  className="gh-btn inline-flex items-center gap-1.5 text-[var(--color-danger,#b91c1c)]"
                >
                  <Trash2 className="size-3.5" aria-hidden />
                  Remove
                </button>
                <button type="submit" className="gh-btn gh-btn-primary">
                  Save
                </button>
              </div>
            </form>
          ))}
        </div>
      ) : (
        <p className="mb-4 text-[13px] text-[var(--color-text-muted)]">
          No authority links yet.
        </p>
      )}

      <form action={addLink} className="rounded-md border border-dashed border-[var(--color-border)] p-3">
        <p className="mb-2 text-[12px] font-bold uppercase tracking-[0.08em] text-[var(--color-text-muted)]">
          Add authority link
        </p>
        <LinkFields row={null} />
        <div className="mt-2 flex justify-end">
          <button type="submit" className="gh-btn gh-btn-primary">
            Add
          </button>
        </div>
      </form>
    </AdminCard>
  );
}

function LinkFields({ row }: { row: AdminAuthorityLinkDto | null }) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      <label className="flex flex-col gap-1">
        <span className="gh-field-label">Name</span>
        <input type="text" name="name" maxLength={200} defaultValue={row?.name ?? ""} className="gh-input" />
      </label>
      <label className="flex flex-col gap-1">
        <span className="gh-field-label">Abbreviation</span>
        <input type="text" name="abbreviation" maxLength={32} defaultValue={row?.abbreviation ?? ""} placeholder="IMC" className="gh-input" />
      </label>
      <label className="flex flex-col gap-1 sm:col-span-2">
        <span className="gh-field-label">URL</span>
        <input
          type="text"
          inputMode="url"
          name="url"
          maxLength={500}
          defaultValue={row?.url ?? ""}
          placeholder="https://www.medicalcouncil.ie"
          className="gh-input"
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="gh-field-label">Category</span>
        <select name="category" defaultValue={row?.category ?? "OTHER"} className="gh-input">
          {CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>
              {cat.replace(/_/g, " ")}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1">
        <span className="gh-field-label">Sort order</span>
        <input type="number" name="sortOrder" min={0} max={9999} defaultValue={row?.sortOrder ?? 0} className="gh-input" />
      </label>
      <label className="flex flex-col gap-1 sm:col-span-2">
        <span className="gh-field-label">Description</span>
        <input type="text" name="description" maxLength={500} defaultValue={row?.description ?? ""} className="gh-input" />
      </label>
      <label className="inline-flex items-center gap-2 text-[13px]">
        <input type="checkbox" name="showInFooter" defaultChecked={row?.showInFooter ?? false} />
        In footer
      </label>
      <label className="inline-flex items-center gap-2 text-[13px]">
        <input type="checkbox" name="showInSchema" defaultChecked={row?.showInSchema ?? true} />
        In schema
      </label>
    </div>
  );
}

const cardTitleStyle = {
  margin: 0,
  fontFamily: "var(--font-display)",
  fontSize: 16,
  fontWeight: 800,
  color: "var(--color-text-primary)",
} as const;
