import { Trash2 } from "lucide-react";
import { AdminCard } from "../../_components/atoms";
import { ManagedImageField } from "../../_components/managed-image-field";
import type { AdminPartnerDto } from "@/lib/admin/admin-api";

type Action = (formData: FormData) => void | Promise<void>;

/**
 * Per-country partners manager. Each partner has a logo (uploaded image),
 * a display name, an optional outbound website link, a sort order and an
 * active flag. Drives the "Our partners" marquee on the country home page.
 */
export function PartnersManager({
  partners,
  createAction,
  updateAction,
  deleteAction,
}: {
  partners: AdminPartnerDto[];
  createAction: Action;
  updateAction: Action;
  deleteAction: Action;
}) {
  return (
    <AdminCard>
      <h3 style={cardTitleStyle}>Partners</h3>
      <p className="mb-4 mt-1 text-[13px] text-[var(--color-text-muted)]">
        Logos shown in the “Our partners” marquee on this country’s home page.
        Upload a logo, set the name and an optional link. Lower sort order shows
        first; inactive partners are hidden.
      </p>

      {partners.length > 0 ? (
        <div className="mb-5 grid gap-3">
          {partners.map((p) => (
            <form
              key={p.id}
              action={updateAction}
              className="rounded-md border border-[var(--color-border)] bg-[var(--color-background-soft)] p-3"
            >
              <input type="hidden" name="id" value={p.id} />
              <PartnerFields partner={p} />
              <div className="mt-2 flex justify-end gap-2">
                <button
                  type="submit"
                  formAction={deleteAction}
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
        <p className="mb-5 text-[13px] text-[var(--color-text-muted)]">
          No partners yet.
        </p>
      )}

      <form
        action={createAction}
        className="rounded-md border border-dashed border-[var(--color-border)] p-3"
      >
        <p className="mb-2 text-[12px] font-bold uppercase tracking-[0.08em] text-[var(--color-text-muted)]">
          Add partner
        </p>
        <PartnerFields partner={null} />
        <div className="mt-2 flex justify-end">
          <button type="submit" className="gh-btn gh-btn-primary">
            Add
          </button>
        </div>
      </form>
    </AdminCard>
  );
}

function PartnerFields({ partner }: { partner: AdminPartnerDto | null }) {
  return (
    <div className="grid gap-3 sm:grid-cols-[160px_1fr]">
      <ManagedImageField
        name="logoImagePath"
        label="Logo"
        initialPath={partner?.logoPath ?? null}
        hint="PNG/SVG-style logo on transparent or white. Max 5 MB."
      />
      <div className="grid gap-3">
        <label className="flex flex-col gap-1">
          <span className="gh-field-label">Name</span>
          <input
            type="text"
            name="name"
            maxLength={200}
            defaultValue={partner?.name ?? ""}
            placeholder="Partner organisation"
            className="gh-input"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="gh-field-label">Website URL</span>
          <input
            type="url"
            name="websiteUrl"
            maxLength={500}
            defaultValue={partner?.websiteUrl ?? ""}
            placeholder="https://partner.example.com"
            className="gh-input"
          />
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1">
            <span className="gh-field-label">Sort order</span>
            <input
              type="number"
              name="sortOrder"
              min={0}
              max={9999}
              defaultValue={partner?.sortOrder ?? 0}
              className="gh-input"
            />
          </label>
          <label className="mt-6 inline-flex items-center gap-2 text-[13px]">
            <input type="checkbox" name="active" defaultChecked={partner?.active ?? true} />
            Active
          </label>
        </div>
      </div>
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
