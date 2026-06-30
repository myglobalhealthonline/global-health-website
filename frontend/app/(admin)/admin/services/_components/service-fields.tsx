import Link from "next/link";
import type { AdminCountryDto, AdminServiceDto, AdminServiceKind } from "@/lib/admin/admin-api";
import { ManagedImageField } from "../../_components/managed-image-field";
import { MultiImageField } from "../../_components/multi-image-field";
import { formatServicePriceInput } from "@/lib/admin/service-form-parse";
import { SERVICE_KIND_META } from "@/lib/admin/service-kind";
import { ServiceTranslationTabs } from "./service-translation-tabs";

type Props = {
  countries: Pick<AdminCountryDto, "id" | "code" | "name">[];
  kind: AdminServiceKind;
  initial?: AdminServiceDto | null;
  pinnedCountryId?: string;
  countryLocked?: boolean;
  /** Locale tabs for the CMS content section, derived from the service's
   *  country enabled locales. Always includes the default locale. */
  locales: { code: string; isDefault: boolean }[];
  defaultLocale: string;
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
  kind,
  initial,
  pinnedCountryId,
  countryLocked,
  doctorOptions,
  locales,
  defaultLocale,
}: Props) {
  const pinId = pinnedCountryId ?? (countryLocked ? initial?.countryId : undefined);
  const pinnedMeta = pinId ? countries.find((c) => c.id === pinId) : undefined;
  const meta = SERVICE_KIND_META[kind];
  const assignedDoctorIds = new Set(
    (initial?.assignedDoctors ?? []).map((row) => row.doctorId),
  );
  const baseFallback = {
    name: initial?.name ?? "",
    summary: initial?.summary ?? null,
    seoTitle: initial?.seoTitle ?? null,
    seoDescription: initial?.seoDescription ?? null,
    heroTitle: initial?.heroTitle ?? null,
    heroDescription: initial?.heroDescription ?? null,
    detailBody: initial?.detailBody ?? null,
    ctaLabel: initial?.ctaLabel ?? null,
  };

  return (
    <div className="gh-admin-service-fields">
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

      <div className="gh-admin-service-note">
        This record will publish under <span className="font-semibold text-[var(--color-text-primary)]">{meta.label}</span>.
      </div>

      <div className="gh-admin-service-field-grid gh-admin-service-field-grid--two">
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
      </div>

      <ServiceTranslationTabs
        locales={locales}
        defaultLocale={defaultLocale}
        initialTranslations={initial?.translations ?? []}
        baseFallback={baseFallback}
      />

      <div className="gh-admin-service-field-grid gh-admin-service-field-grid--three">
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

      <div className="gh-admin-service-field-grid gh-admin-service-field-grid--two">
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
      <fieldset className="gh-admin-service-doctors">
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
            <div className="gh-admin-service-doctor-grid">
              {doctorOptions
                .slice()
                .sort((a, b) => a.fullName.localeCompare(b.fullName))
                .map((doc) => (
                  <label
                    key={doc.id}
                    className="gh-admin-service-doctor-option"
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

      <input type="hidden" name="legacyPath" defaultValue={initial?.legacyPath ?? ""} />

      <label className="gh-admin-service-active-row">
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
