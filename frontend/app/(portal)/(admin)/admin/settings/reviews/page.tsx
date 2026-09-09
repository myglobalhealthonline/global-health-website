import { redirect } from "next/navigation";
import { revalidateTag } from "next/cache";
import { requireAdminAction } from "@/lib/admin/require-admin-action";
import { fetchAdminReviewSettings, patchAdminReviewSettings, fetchReviewEmailPreviews } from "@/lib/admin/admin-api";
import { AdminCard, Btn, PageHeader } from "../../_components/atoms";
import { FormSection } from "@/components/FormSection";
import { Star } from "lucide-react";
import Link from "next/link";
import { ReviewAutomationSettings } from "./ReviewAutomationSettings";
import { ReviewEmailPreviews } from "./ReviewEmailPreviews";
import { ReviewActivity } from "./ReviewActivity";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: Promise<{ error?: string; success?: string; tab?: string; page?: string; country?: string; status?: string }>;
};

/** One provider block's three form fields → the PATCH payload shape the
 *  backend expects (see admin-settings.schema.ts's reviewSettingsSchema):
 *  both rating + count blank clears the aggregate; both filled sets it;
 *  exactly one filled is rejected (can't have a rating with no count). */
function parseAggregate(
  formData: FormData,
  prefix: string,
): { rating: number; count: number } | null | undefined {
  const ratingRaw = String(formData.get(`${prefix}Rating`) ?? "").trim();
  const countRaw = String(formData.get(`${prefix}Count`) ?? "").trim();
  if (ratingRaw === "" && countRaw === "") return null;
  if (!ratingRaw || !countRaw) throw new Error(`${prefix}: enter both rating and count, or leave both blank`);
  const rating = Number(ratingRaw);
  const count = Number(countRaw);
  if (!Number.isFinite(rating) || rating < 0 || rating > 5) {
    throw new Error(`${prefix} rating must be a number between 0 and 5`);
  }
  if (!Number.isFinite(count) || !Number.isInteger(count) || count < 0) {
    throw new Error(`${prefix} review count must be a whole number`);
  }
  return { rating, count };
}

export default async function AdminReviewSettingsPage({ searchParams }: PageProps) {
  const sp = searchParams ? await searchParams : {};
  const result = await fetchAdminReviewSettings();

  async function saveAction(formData: FormData) {
    "use server";
    await requireAdminAction();

    const website = formData.get("section") === "website";
    const tab = website ? "website" : "automation";
    let body: Record<string, unknown>;
    try {
      const primaryRaw = String(formData.get("primaryProvider") ?? "").trim();
      body = {
        trustpilot: {
          businessUnitId: String(formData.get("trustpilotId") ?? "").trim() || null,

          aggregate: parseAggregate(formData, "trustpilot"),
        },
        google: {
          placeId: String(formData.get("googleId") ?? "").trim() || null,
          aggregate: parseAggregate(formData, "google"),
        },
        doctify: {
          clinicId: String(formData.get("doctifyId") ?? "").trim() || null,

          aggregate: parseAggregate(formData, "doctify"),
        },
        primaryProvider: primaryRaw === "" ? null : primaryRaw,

      };
      if (!website) body = {
        automation: { enabled: formData.get("enabled") === "on", delayHours: Number(formData.get("delayHours")), maxFollowups: Number(formData.get("maxFollowups")), followupIntervalDays: Number(formData.get("followupIntervalDays")) },
        doctify: { reviewUrl: String(formData.get("doctifyReviewUrl") ?? "").trim() || null },
        trustpilot: { reviewUrl: String(formData.get("trustpilotReviewUrl") ?? "").trim() || null },
        destinations: settings.destinations.map((d) => ({ countryCode: d.countryCode, sendReviewRequests: formData.get(`sendReviewRequests_${d.countryCode}`) === "true", googleReviewUrl: String(formData.get(`googleReviewUrl_${d.countryCode}`) ?? "").trim() || null })),
      };
    } catch (err) {
      redirect(
        `/admin/settings/reviews?tab=${tab}&error=${encodeURIComponent(
          err instanceof Error ? err.message : "Invalid review settings",
        )}`,
      );
    }

    const res = await patchAdminReviewSettings(body);
    if (!res.ok) {
      redirect(`/admin/settings/reviews?tab=${tab}&error=${encodeURIComponent(res.message)}`);
    }

    // Public reviews-config read (Doctify widget numbers + the site-wide
    // AggregateRating JSON-LD) is tagged so this takes effect immediately
    // instead of waiting out the 5-minute revalidate window.
    revalidateTag("reviews-config", "max");
    redirect(`/admin/settings/reviews?tab=${tab}&success=${encodeURIComponent("Review settings saved")}`);
  }

  if (!result.ok) {
    return (
      <>
        <PageHeader eyebrow="Settings" title="Reviews" icon={<Star className="size-4" />} />
        <AdminCard>
          <p className="gh-status-warning rounded-[var(--radius-card-sm)] border px-4 py-3 text-sm">
            Could not load review settings: {result.message}
          </p>
        </AdminCard>
      </>
    );
  }

  const settings = result.data;
  const previews = sp.tab !== "activity" && sp.tab !== "website" ? await fetchReviewEmailPreviews() : null;

  return (
    <>
      <PageHeader
        eyebrow="Settings"
        title="Reviews"
        icon={<Star className="size-4" />}
        description="Control patient review requests, global Trustpilot and Doctify profiles, and each country's Google Business Profile."
      />

      {sp.error ? (
        <p className="gh-status-warning mb-4 rounded-[var(--radius-card-sm)] border px-4 py-3 text-sm">
          {sp.error}
        </p>
      ) : null}
      {sp.success ? (
        <p className="gh-status-success mb-4 rounded-[var(--radius-card-sm)] border px-4 py-3 text-sm">
          {sp.success}
        </p>
      ) : null}

      <nav aria-label="Review settings" className="mb-5 flex flex-wrap gap-3">
        {[["automation", "Automation"], ["activity", "Activity"], ["website", "Website display"]].map(([key, label]) => <Link key={key} href={`?tab=${key}`} aria-current={(sp.tab ?? "automation") === key ? "page" : undefined} className="gh-btn gh-btn-secondary">{label}</Link>)}
      </nav>
      {sp.tab === "activity" ? <ReviewActivity searchParams={sp} /> : sp.tab !== "website" ? (
        <form action={saveAction} className="grid gap-4">
          <input type="hidden" name="section" value="automation" />
          <ReviewAutomationSettings settings={settings} />
          {previews?.ok ? <ReviewEmailPreviews previews={previews.data} /> : <p role="status">Email preview unavailable.</p>}
          <div className="flex justify-end"><Btn type="submit" variant="primary">Save automation</Btn></div>
        </form>
      ) : <form action={saveAction} className="grid gap-4">
        <input type="hidden" name="section" value="website" />
        <FormSection
          title="Primary provider"
          description="Whichever provider is selected here feeds the site-wide AggregateRating structured data (the star rating Google can show in search results). Leave unset to keep emitting no rating markup at all."
        >
          <label className="flex flex-col gap-2">
            <span className="gh-field-label">Primary provider</span>
            <select
              name="primaryProvider"
              className="gh-select min-w-0"
              defaultValue={settings.primaryProvider ?? ""}
            >
              <option value="">— None (emit no AggregateRating) —</option>
              <option value="TRUSTPILOT">Trustpilot</option>
              <option value="GOOGLE">Google</option>
              <option value="DOCTIFY">Doctify</option>
            </select>
          </label>
        </FormSection>

        <FormSection
          title="Doctify global rating and widget"
          description="Widget identifier and verified public rating data. These fields do not control where patients leave reviews."
        >
          <label className="flex flex-col gap-2">
            <span className="gh-field-label">Clinic id</span>
            <input
              name="doctifyId"
              className="gh-input min-w-0"
              maxLength={120}
              defaultValue={settings.doctify.clinicId ?? ""}
            />
          </label>
          <label className="flex flex-col gap-2">
            <span className="gh-field-label">Rating (0–5)</span>
            <input
              name="doctifyRating"
              type="number"
              min={0}
              max={5}
              step={0.1}
              className="gh-input min-w-0"
              defaultValue={settings.doctify.aggregate?.rating ?? ""}
            />
          </label>
          <label className="flex flex-col gap-2">
            <span className="gh-field-label">Review count</span>
            <input
              name="doctifyCount"
              type="number"
              min={0}
              step={1}
              className="gh-input min-w-0"
              defaultValue={settings.doctify.aggregate?.count ?? ""}
            />
            <span className="text-xs text-[var(--color-text-muted)]">
              {settings.doctify.aggregate
                ? `Last saved ${new Date(settings.doctify.aggregate.updatedAt).toLocaleDateString()}. Saving again — even with the same numbers — refreshes this date and keeps the rating eligible for structured data.`
                : "Leave rating and count both blank to omit this provider's aggregate."}
            </span>
          </label>
        </FormSection>

        <FormSection
          title="Trustpilot global rating data"
          description="Business identifier and verified public rating data. The patient review URL is configured above."
        >
          <label className="flex flex-col gap-2">
            <span className="gh-field-label">Business unit id</span>
            <input
              name="trustpilotId"
              className="gh-input min-w-0"
              maxLength={120}
              defaultValue={settings.trustpilot.businessUnitId ?? ""}
            />
          </label>
          <label className="flex flex-col gap-2">
            <span className="gh-field-label">Rating (0–5)</span>
            <input
              name="trustpilotRating"
              type="number"
              min={0}
              max={5}
              step={0.1}
              className="gh-input min-w-0"
              defaultValue={settings.trustpilot.aggregate?.rating ?? ""}
            />
          </label>
          <label className="flex flex-col gap-2">
            <span className="gh-field-label">Review count</span>
            <input
              name="trustpilotCount"
              type="number"
              min={0}
              step={1}
              className="gh-input min-w-0"
              defaultValue={settings.trustpilot.aggregate?.count ?? ""}
            />
            <span className="text-xs text-[var(--color-text-muted)]">
              {settings.trustpilot.aggregate
                ? `Last saved ${new Date(settings.trustpilot.aggregate.updatedAt).toLocaleDateString()}.`
                : "Leave rating and count both blank to omit this provider's aggregate."}
            </span>
          </label>
        </FormSection>

        <FormSection
          title="Google rating data (legacy display)"
          description="This saved rating belongs to one Google Business Profile, not all six countries. Existing website rendering is preserved; country review links are managed in Automation."
        >
          <label className="flex flex-col gap-2">
            <span className="gh-field-label">Place id</span>
            <input
              name="googleId"
              className="gh-input min-w-0"
              maxLength={120}
              defaultValue={settings.google.placeId ?? ""}
            />
            <span className="text-xs text-[var(--color-text-muted)]">
              When a Google Places API key is configured server-side, the rating/count
              below refresh automatically (at most once a day) — manual entry is only
              the fallback.
            </span>
          </label>
          <label className="flex flex-col gap-2">
            <span className="gh-field-label">Rating (0–5)</span>
            <input
              name="googleRating"
              type="number"
              min={0}
              max={5}
              step={0.1}
              className="gh-input min-w-0"
              defaultValue={settings.google.aggregate?.rating ?? ""}
            />
          </label>
          <label className="flex flex-col gap-2">
            <span className="gh-field-label">Review count</span>
            <input
              name="googleCount"
              type="number"
              min={0}
              step={1}
              className="gh-input min-w-0"
              defaultValue={settings.google.aggregate?.count ?? ""}
            />
            <span className="text-xs text-[var(--color-text-muted)]">
              {settings.google.aggregate
                ? `Last saved ${new Date(settings.google.aggregate.updatedAt).toLocaleDateString()}.`
                : "Leave rating and count both blank to omit this provider's aggregate."}
            </span>
          </label>
        </FormSection>

        <div className="flex justify-end gap-3">
          <Btn type="submit" variant="primary">
            Save website display
          </Btn>
        </div>
      </form>}
    </>
  );
}
