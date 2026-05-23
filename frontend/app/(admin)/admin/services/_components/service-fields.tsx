import Link from "next/link";
import type { AdminCountryDto, AdminServiceDto, AdminServiceKind, AdminSpecialtyOptionDto } from "@/lib/admin/admin-api";
import { ManagedImageField } from "../../_components/managed-image-field";
import { MultiImageField } from "../../_components/multi-image-field";
import { formatServicePriceInput } from "@/lib/admin/service-form-parse";
import { SERVICE_KIND_META } from "@/lib/admin/service-kind";

type Props = {
  countries: Pick<AdminCountryDto, "id" | "code" | "name">[];
  specialties: AdminSpecialtyOptionDto[];
  kind: AdminServiceKind;
  initial?: AdminServiceDto | null;
  pinnedCountryId?: string;
  countryLocked?: boolean;
  /** Doctors eligible to be assigned to this service. Already filtered
   *  on the server to those whose primary country (or DoctorCountry
   *  link) matches the service country. Pass `null` when no country is
   *  pinned yet — the checklist hides itself with a hint. */
  doctorOptions?: Array<{
    id: string;
    slug: string;
    fullName: string;
    title: string;
    active: boolean;
  }> | null;
};

export function ServiceFields({
  countries,
  specialties,
  kind,
  initial,
  pinnedCountryId,
  countryLocked,
  doctorOptions,
}: Props) {
  const pinId = pinnedCountryId ?? (countryLocked ? initial?.countryId : undefined);
  const pinnedMeta = pinId ? countries.find((c) => c.id === pinId) : undefined;
  const meta = SERVICE_KIND_META[kind];
  const usesSpecialty = kind === "SPECIALIST";
  const assignedDoctorIds = new Set(
    (initial?.assignedDoctors ?? []).map((row) => row.doctorId),
  );

  return (
    <div className="flex flex-col gap-6">
      <input type="hidden" name="kind" value={kind} />

      {pinId && pinnedMeta ? (
        <div>
          <span className="gh-field-label">Country</span>
          <p className="mt-1 text-[var(--color-text-primary)]">
            {pinnedMeta.name} ({pinnedMeta.code})
          </p>
          <input type="hidden" name="countryId" value={pinId} />
        </div>
      ) : (
        <label className="flex flex-col gap-2">
          <span className="gh-field-label">Country</span>
          <select
            name="countryId"
            className="gh-select min-w-0"
            required
            defaultValue={initial?.countryId ?? ""}
          >
            <option value="">Select country</option>
            {countries.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.code})
              </option>
            ))}
          </select>
        </label>
      )}

      <div className="rounded-[var(--radius-card-sm)] border border-[var(--color-border)] bg-[var(--color-background-soft)] px-4 py-3 text-sm text-[var(--color-text-muted)]">
        This record will publish under <span className="font-semibold text-[var(--color-text-primary)]">{meta.label}</span>.
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-2">
          <span className="gh-field-label">Slug</span>
          <input
            name="slug"
            className="gh-input min-w-0 font-mono text-sm"
            required
            defaultValue={initial?.slug}
            placeholder="e.g. cardiology-consultation"
          />
        </label>
        <label className="flex flex-col gap-2 sm:col-span-2">
          <span className="gh-field-label">Title (name)</span>
          <input name="name" className="gh-input min-w-0" required defaultValue={initial?.name} />
        </label>
      </div>

      {usesSpecialty ? (
        <label className="flex flex-col gap-2">
          <span className="gh-field-label">Category</span>
          <select name="specialtyId" className="gh-select min-w-0" defaultValue={initial?.specialtyId ?? ""} required>
            <option value="">Select category</option>
            {specialties.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.slug}){!s.active ? " - inactive" : ""}
              </option>
            ))}
          </select>
        </label>
      ) : (
        <input type="hidden" name="specialtyId" value="" />
      )}

      <label className="flex flex-col gap-2">
        <span className="gh-field-label">Summary</span>
        <textarea
          name="summary"
          rows={4}
          className="gh-input min-h-[6rem] min-w-0 resize-y"
          defaultValue={initial?.summary ?? ""}
        />
      </label>

      <div className="grid gap-4 sm:grid-cols-3">
        <label className="flex flex-col gap-2">
          <span className="gh-field-label">Sort order</span>
          <input
            type="number"
            name="sortOrder"
            min={0}
            step={1}
            className="gh-input min-w-0"
            defaultValue={initial?.sortOrder ?? 0}
          />
        </label>
        <label className="flex flex-col gap-2">
          <span className="gh-field-label">Duration (minutes)</span>
          <input
            type="number"
            name="durationMinutes"
            min={1}
            step={1}
            className="gh-input min-w-0"
            defaultValue={initial?.durationMinutes ?? ""}
          />
        </label>
        <label className="flex flex-col gap-2">
          <span className="gh-field-label">Starting price</span>
          <input
            type="text"
            inputMode="decimal"
            name="basePrice"
            className="gh-input min-w-0"
            defaultValue={formatServicePriceInput(initial?.basePriceCents)}
            placeholder="45.00"
          />
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-2">
          <span className="gh-field-label">Currency code</span>
          <input
            name="currencyCode"
            className="gh-input min-w-0 uppercase"
            placeholder="EUR"
            maxLength={8}
            defaultValue={initial?.currencyCode ?? ""}
          />
        </label>
        <label className="flex flex-col gap-2">
          <span className="gh-field-label">Shipping price</span>
          <input
            type="text"
            inputMode="decimal"
            name="shipping"
            className="gh-input min-w-0"
            defaultValue={
              initial?.shippingCents && initial.shippingCents > 0
                ? (initial.shippingCents / 100).toFixed(2)
                : ""
            }
            placeholder="0.00"
          />
          <span className="text-xs text-[var(--color-text-muted)]">
            Charged per item at checkout. Leave blank for online services
            (no shipping). Set a value for prescription delivery.
          </span>
        </label>
      </div>

      <ManagedImageField
        name="imagePath"
        label="Hero image"
        initialPath={initial?.assets[0]?.path ?? ""}
        helperText={`Shown on the public ${meta.singularLabel.toLowerCase()} card and detail page.`}
      />

      <MultiImageField
        name="galleryImagePaths"
        label="Gallery images"
        initialPaths={initial?.galleryImagePaths ?? []}
        helperText="Optional additional images. Up to 12. Not yet rendered on the public listing — saved for a future detail page."
        max={12}
      />

      {/* Doctor assignment — the public consult flow lists doctors filtered
          by this set. An empty set means the service has no bookable
          doctors, which the public page surfaces as "no slots available
          yet". */}
      <fieldset className="flex flex-col gap-2">
        <legend className="gh-field-label">Assigned doctors</legend>
        {doctorOptions === null ? (
          <p className="text-[12px] text-[var(--color-text-muted)]">
            Pick the country first to load eligible doctors.
          </p>
        ) : !doctorOptions || doctorOptions.length === 0 ? (
          <p className="text-[12px] text-[var(--color-text-muted)]">
            No doctors are listed in this country yet. Create or assign one
            under{" "}
            <Link
              href="/admin/doctors"
              className="font-semibold text-[var(--color-brand-primary)] underline-offset-2 hover:underline"
            >
              Doctors
            </Link>
            .
          </p>
        ) : (
          <>
            {/* Sentinel — an empty hidden input ensures formData.getAll
                ("doctorIds") returns at least the empty string when the
                admin un-ticks every box. The parser filters falsy
                entries so the resulting array is [] (clears the
                assignment), not undefined (which would skip the
                update). */}
            <input type="hidden" name="doctorIds" value="" />
            <div className="grid gap-1.5 sm:grid-cols-2">
              {doctorOptions
                .slice()
                .sort((a, b) => a.fullName.localeCompare(b.fullName))
                .map((doc) => (
                  <label
                    key={doc.id}
                    className="inline-flex items-start gap-2 rounded-[var(--radius-card-sm)] border border-[var(--color-border)] px-3 py-2 text-sm"
                  >
                    <input
                      type="checkbox"
                      name="doctorIds"
                      value={doc.id}
                      defaultChecked={assignedDoctorIds.has(doc.id)}
                      className="mt-0.5 h-4 w-4 rounded border-[var(--color-border)]"
                    />
                    <span className="flex min-w-0 flex-col">
                      <span
                        className={`truncate font-semibold ${
                          doc.active
                            ? "text-[var(--color-text-primary)]"
                            : "text-[var(--color-text-muted)] line-through"
                        }`}
                      >
                        {doc.fullName}
                      </span>
                      <span className="truncate text-[11px] text-[var(--color-text-muted)]">
                        {doc.title}
                        {doc.active ? "" : " · inactive"}
                      </span>
                    </span>
                  </label>
                ))}
            </div>
            <span className="text-[11px] text-[var(--color-text-muted)]">
              Patients booking this service only see ticked doctors. Untick
              all to take the service offline without changing its status.
            </span>
          </>
        )}
      </fieldset>

      <div className="flex flex-col gap-5 rounded-[var(--radius-card-sm)] border border-[var(--color-border)] p-5">
        <header>
          <h3 className="m-0 text-sm font-bold text-[var(--color-text-primary)]">Hero &amp; detail page</h3>
          <p className="mt-1 text-xs text-[var(--color-text-muted)]">Shown on the public detail page and used for SEO previews.</p>
        </header>
        <label className="flex flex-col gap-2">
          <span className="gh-field-label">Hero title</span>
          <input name="heroTitle" className="gh-input min-w-0" defaultValue={initial?.heroTitle ?? ""} placeholder="e.g. Online Medical Consultation Ireland" />
        </label>
        <label className="flex flex-col gap-2">
          <span className="gh-field-label">Hero description</span>
          <textarea name="heroDescription" rows={3} className="gh-input min-w-0 resize-y" defaultValue={initial?.heroDescription ?? ""} placeholder="Short tagline shown under the hero title." />
        </label>
        <label className="flex flex-col gap-2">
          <span className="gh-field-label">CTA button label</span>
          <input name="ctaLabel" className="gh-input min-w-0" defaultValue={initial?.ctaLabel ?? ""} placeholder="e.g. Book Consultation" />
        </label>
        <label className="flex flex-col gap-2">
          <span className="gh-field-label">Detail body (HTML)</span>
          <textarea name="detailBody" rows={6} className="gh-input min-w-0 resize-y font-mono text-xs" defaultValue={initial?.detailBody ?? ""} placeholder="<p>Rich description shown on the service detail page.</p>" />
        </label>
      </div>
      <input type="hidden" name="legacyPath" defaultValue={initial?.legacyPath ?? ""} />

      <label className="flex items-center gap-3 text-sm text-[var(--color-text-primary)]">
        <input
          type="checkbox"
          name="isActive"
          defaultChecked={initial?.isActive ?? true}
          className="h-4 w-4 rounded border-[var(--color-border)]"
        />
        Service active
      </label>
    </div>
  );
}
