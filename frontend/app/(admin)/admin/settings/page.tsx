import { redirect } from "next/navigation";
import { revalidateTag } from "next/cache";
import {
  AdminCard,
  Btn,
  PageHeader,
  SectionHeader,
} from "../_components/atoms";
import {
  fetchAdminReviewSettings,
  patchAdminReviewSettings,
} from "@/lib/admin/admin-settings-api";

export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;

const inputClass =
  "mt-1 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-background-page)] px-3 py-2 text-[14px] text-[var(--color-text-primary)]";
const labelClass =
  "block text-[12px] font-semibold text-[var(--color-text-muted)]";

export default async function AdminSettingsPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const sp = searchParams ? await searchParams : {};
  const success = typeof sp.success === "string" ? sp.success : null;
  const errorMsg = typeof sp.error === "string" ? sp.error : null;
  const res = await fetchAdminReviewSettings();
  if (!res.ok) {
    return (
      <>
        <PageHeader eyebrow="Global" title="Settings" />
        <AdminCard>
          <p className="gh-status-warning rounded-md border px-4 py-3 text-sm">
            Could not load settings: {res.message}
          </p>
        </AdminCard>
      </>
    );
  }
  const cfg = res.data;

  async function saveAction(formData: FormData) {
    "use server";
    function s(name: string): string | null {
      const v = formData.get(name);
      if (v === null) return null;
      const str = String(v).trim();
      return str === "" ? null : str;
    }
    function n(name: string): number | null {
      const raw = s(name);
      if (raw === null) return null;
      const num = Number(raw);
      return Number.isFinite(num) ? num : null;
    }
    function readAggregate(prefix: string) {
      const rating = n(`${prefix}.rating`);
      const count = n(`${prefix}.count`);
      if (rating === null && count === null) return null;
      return {
        rating: rating ?? 0,
        count: count ?? 0,
      };
    }
    const body = {
      trustpilot: {
        businessUnitId: s("trustpilot.id"),
        aggregate: readAggregate("trustpilot"),
      },
      google: {
        placeId: s("google.id"),
        aggregate: readAggregate("google"),
      },
      doctify: {
        clinicId: s("doctify.id"),
        aggregate: readAggregate("doctify"),
      },
      primaryProvider:
        s("primaryProvider") as "TRUSTPILOT" | "GOOGLE" | "DOCTIFY" | null,
    };
    const result = await patchAdminReviewSettings(body);
    if (!result.ok) {
      redirect(`/admin/settings?error=${encodeURIComponent(result.message)}`);
    }
    // Invalidate the public review config cache so the badge updates next render.
    revalidateTag("reviews-config", "max");
    redirect("/admin/settings?success=Review%20settings%20saved");
  }

  return (
    <>
      <PageHeader
        eyebrow="Global"
        title="Settings"
        description="Review providers, support contacts, and other site-wide configuration."
      />

      {success ? (
        <AdminCard>
          <p className="rounded-md border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            {success}
          </p>
        </AdminCard>
      ) : null}
      {errorMsg ? (
        <AdminCard>
          <p className="gh-status-warning rounded-md border px-4 py-3 text-sm">{errorMsg}</p>
        </AdminCard>
      ) : null}

      <form action={saveAction} className="mt-4 flex flex-col gap-6">
        <AdminCard padding={0}>
          <SectionHeader
            title="Trustpilot"
            description="Paste your Trustpilot Business Unit ID + current aggregate snapshot. The Business Unit ID also unlocks the inline TrustBox widget."
          />
          <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-3">
            <label className={labelClass}>
              Business Unit ID
              <input
                type="text"
                name="trustpilot.id"
                defaultValue={cfg.trustpilot.businessUnitId ?? ""}
                placeholder="e.g. 4f1a8a1c0000ff000abc1234"
                className={inputClass}
              />
              <span className="mt-1 block text-[11px] text-[var(--color-text-muted)]">
                Find it in Trustpilot Business → Integrations → TrustBox.
              </span>
            </label>
            <label className={labelClass}>
              Rating (0–5)
              <input
                type="number"
                step="0.01"
                min={0}
                max={5}
                name="trustpilot.rating"
                defaultValue={cfg.trustpilot.aggregate?.rating ?? ""}
                placeholder="4.94"
                className={inputClass}
              />
            </label>
            <label className={labelClass}>
              Review count
              <input
                type="number"
                min={0}
                name="trustpilot.count"
                defaultValue={cfg.trustpilot.aggregate?.count ?? ""}
                placeholder="2000"
                className={inputClass}
              />
            </label>
          </div>
        </AdminCard>

        <AdminCard padding={0}>
          <SectionHeader
            title="Google"
            description="Google Place ID for your business profile + current aggregate rating."
          />
          <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-3">
            <label className={labelClass}>
              Place ID
              <input
                type="text"
                name="google.id"
                defaultValue={cfg.google.placeId ?? ""}
                placeholder="ChIJN1t_tDeuEmsRUsoyG83frY4"
                className={inputClass}
              />
              <span className="mt-1 block text-[11px] text-[var(--color-text-muted)]">
                Use the{" "}
                <a
                  className="text-[var(--color-brand-primary)] underline"
                  href="https://developers.google.com/maps/documentation/javascript/examples/places-placeid-finder"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Place ID Finder
                </a>{" "}
                tool to get this.
              </span>
            </label>
            <label className={labelClass}>
              Rating (0–5)
              <input
                type="number"
                step="0.01"
                min={0}
                max={5}
                name="google.rating"
                defaultValue={cfg.google.aggregate?.rating ?? ""}
                placeholder="4.8"
                className={inputClass}
              />
            </label>
            <label className={labelClass}>
              Review count
              <input
                type="number"
                min={0}
                name="google.count"
                defaultValue={cfg.google.aggregate?.count ?? ""}
                placeholder="350"
                className={inputClass}
              />
            </label>
          </div>
        </AdminCard>

        <AdminCard padding={0}>
          <SectionHeader
            title="Doctify"
            description="Doctify clinic slug + aggregate. The badge links out to your Doctify profile."
          />
          <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-3">
            <label className={labelClass}>
              Clinic ID / slug
              <input
                type="text"
                name="doctify.id"
                defaultValue={cfg.doctify.clinicId ?? ""}
                placeholder="global-health"
                className={inputClass}
              />
            </label>
            <label className={labelClass}>
              Rating (0–5)
              <input
                type="number"
                step="0.01"
                min={0}
                max={5}
                name="doctify.rating"
                defaultValue={cfg.doctify.aggregate?.rating ?? ""}
                placeholder="4.95"
                className={inputClass}
              />
            </label>
            <label className={labelClass}>
              Review count
              <input
                type="number"
                min={0}
                name="doctify.count"
                defaultValue={cfg.doctify.aggregate?.count ?? ""}
                placeholder="120"
                className={inputClass}
              />
            </label>
          </div>
        </AdminCard>

        <AdminCard padding={0}>
          <SectionHeader
            title="Primary provider"
            description="The provider whose aggregate is used for schema.org AggregateRating. Search engines surface this in rich results."
          />
          <div className="p-5">
            <label className={labelClass}>
              <select
                name="primaryProvider"
                defaultValue={cfg.primaryProvider ?? ""}
                className={inputClass}
              >
                <option value="">— Auto (first available) —</option>
                <option value="TRUSTPILOT">Trustpilot</option>
                <option value="GOOGLE">Google</option>
                <option value="DOCTIFY">Doctify</option>
              </select>
            </label>
          </div>
        </AdminCard>

        <div className="flex items-center justify-end gap-2">
          <Btn type="submit" variant="primary" size="md">
            Save settings
          </Btn>
        </div>
      </form>
    </>
  );
}
