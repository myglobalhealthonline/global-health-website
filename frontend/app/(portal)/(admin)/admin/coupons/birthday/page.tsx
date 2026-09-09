import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdminAction } from "@/lib/admin/require-admin-action";
import {
  fetchAdminBirthdayOffer,
  putAdminBirthdayOffer,
  previewAdminBirthdayOffer,
  type BirthdayOfferDelivery,
  type CouponLocale,
} from "@/lib/admin/admin-api/coupons";
import { ColumnPriorityTable, type ColumnPriorityField } from "@/components/ColumnPriorityTable";
import { AdminCard, AdminEmptyState, AdminSummaryStrip, Btn, PageHeader } from "../../_components/atoms";

export const dynamic = "force-dynamic";

const PATH = "/admin/coupons/birthday";
const LANGUAGES: Record<CouponLocale, string> = {
  EN: "English", PT: "Portuguese", ES: "Spanish", CS: "Czech", RO: "Romanian", DE: "German",
};
type SearchParams = Record<string, string | string[] | undefined>;
const read = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] : value;

function parseSettings(enabled: boolean, discount: string, validity: string, preview: boolean) {
  const discountPercent = discount.trim() === "" ? null : Number(discount);
  const validityDays = Number(validity);
  if ((enabled || preview) && discountPercent === null) {
    return { error: "Enter a discount percentage before enabling or previewing the offer." } as const;
  }
  if (discountPercent !== null && (!Number.isInteger(discountPercent) || discountPercent < 1 || discountPercent > 100)) {
    return { error: "Discount must be a whole percentage between 1 and 100." } as const;
  }
  if (!Number.isInteger(validityDays) || validityDays < 1 || validityDays > 365) {
    return { error: "Validity must be a whole number of days between 1 and 365." } as const;
  }
  return { settings: { enabled, discountPercent, validityDays } } as const;
}

const fields: ColumnPriorityField<BirthdayOfferDelivery>[] = [
  { key: "code", label: "Coupon", priority: 1, cardPrimary: true, render: (row) => row.coupon.code },
  { key: "year", label: "Year", priority: 2, render: (row) => row.year },
  { key: "status", label: "Status", priority: 1, render: (row) => row.status },
  { key: "error", label: "Delivery detail", priority: 2, render: (row) => row.error ?? "—" },
  { key: "sentAt", label: "Sent (UTC)", priority: 3, render: (row) => row.sentAt ?? "—" },
  { key: "createdAt", label: "Created (UTC)", priority: 3, render: (row) => row.createdAt },
];

export default async function AdminBirthdayOfferPage({ searchParams }: { searchParams?: Promise<SearchParams> }) {
  await requireAdminAction();
  const sp = searchParams ? await searchParams : {};
  const result = await fetchAdminBirthdayOffer();
  const header = <PageHeader eyebrow="Commerce" title="Birthday offer settings"
    description="An annual birthday discount for eligible patients. Changes apply to future coupons only."
    actions={<Btn href="/admin/coupons" variant="ghost">Back to coupons</Btn>} />;
  if (!result.ok) {
    return <>{header}<AdminCard><div role="alert"><AdminEmptyState title="Could not load birthday offer" description={result.message} /></div></AdminCard></>;
  }

  const { settings, summary, recent } = result.data;
  const draft = read(sp.draft) === "1";
  const enabled = draft ? read(sp.enabled) === "true" : settings.enabled ?? false;
  const discount = draft ? read(sp.discountPercent) ?? "" : String(settings.discountPercent ?? "");
  const validity = draft ? read(sp.validityDays) ?? "" : String(settings.validityDays ?? 30);
  const localeValue = read(sp.locale) ?? "EN";
  const locale = Object.hasOwn(LANGUAGES, localeValue) ? localeValue as CouponLocale : "EN";

  async function submitAction(formData: FormData) {
    "use server";
    await requireAdminAction();
    const preview = formData.get("intent") === "preview";
    const enabled = formData.get("enabled") === "on";
    const discount = String(formData.get("discountPercent") ?? "");
    const validity = String(formData.get("validityDays") ?? "");
    const locale = String(formData.get("locale") ?? "EN");
    const params = new URLSearchParams({ draft: "1", enabled: String(enabled), discountPercent: discount, validityDays: validity, locale });
    const parsed = parseSettings(enabled, discount, validity, preview);
    if (parsed.error || !Object.hasOwn(LANGUAGES, locale)) {
      params.set("error", parsed.error ?? "Choose a supported preview language.");
      redirect(`${PATH}?${params}`);
    }
    if (preview) {
      params.set("preview", "1");
      redirect(`${PATH}?${params}`);
    }
    const saved = await putAdminBirthdayOffer(parsed.settings);
    if (!saved.ok) {
      params.set("error", saved.message);
      redirect(`${PATH}?${params}`);
    }
    revalidatePath(PATH);
    redirect(`${PATH}?saved=1`);
  }

  let previewResult: Awaited<ReturnType<typeof previewAdminBirthdayOffer>> | undefined;
  let error = read(sp.error);
  if (read(sp.preview) === "1") {
    const parsed = parseSettings(enabled, discount, validity, true);
    if (parsed.error || !Object.hasOwn(LANGUAGES, localeValue)) {
      error = parsed.error ?? "Choose a supported preview language.";
    } else {
      previewResult = await previewAdminBirthdayOffer({
        discountPercent: parsed.settings.discountPercent!, validityDays: parsed.settings.validityDays, locale,
      });
      if (!previewResult.ok) error = previewResult.message;
    }
  }

  return <>
    {header}
    {error ? <p role="alert" className="gh-status-warning mb-4 rounded-[var(--radius-card-sm)] border px-4 py-3 text-sm">{error}</p> : null}
    {read(sp.saved) === "1" ? <p role="status" className="mb-4">Birthday offer settings saved.</p> : null}
    <AdminCard>
      <p className="mb-4 text-sm">
        Sent once annually on the patient’s birthday, after 09:00 local time using their last known timezone,
        with a country timezone fallback. February 29 birthdays are observed on February 28 in non-leap years.
        Only patients who opted in receive offers; commission markets are excluded.
        Coupons cover GP consultations, are single-use, and expire after 30 days by default (configurable below).
      </p>
      <form action={submitAction} className="grid gap-4">
        <label className="flex items-center gap-2">
          <input type="checkbox" name="enabled" defaultChecked={enabled} /> Enable birthday offers
        </label>
        <label>
          <span className="gh-field-label">Discount percentage (required when enabling or previewing)</span>
          <input className="gh-input" type="number" name="discountPercent" min="1" max="100" step="1" defaultValue={discount} />
        </label>
        <label>
          <span className="gh-field-label">Validity in days</span>
          <input className="gh-input" type="number" name="validityDays" min="1" max="365" step="1" required defaultValue={validity} />
        </label>
        <p className="text-sm">Email language: automatically uses the patient’s platform language, then their latest selected consultation language. Missing or unsupported languages use English. The preview language below does not change delivery.</p>
        <label>
          <span className="gh-field-label">Preview language</span>
          <select className="gh-select" name="locale" defaultValue={locale}>
            {Object.entries(LANGUAGES).map(([code, name]) => <option key={code} value={code}>{name}</option>)}
          </select>
        </label>
        <div className="flex flex-wrap gap-2">
          <button className="gh-btn gh-btn-primary" type="submit" name="intent" value="save">Save settings</button>
          <button className="gh-btn" type="submit" name="intent" value="preview">Preview unsaved offer</button>
        </div>
        <p className="text-sm">Preview uses the form values without saving settings or sending an email.</p>
      </form>
    </AdminCard>
    {previewResult?.ok ? <AdminCard className="mt-4">
      <h2 className="mb-2">Email preview — {LANGUAGES[locale]}</h2>
      <p className="mb-3"><strong>Subject:</strong> {previewResult.data.subject}</p>
      <iframe title="Birthday offer email preview" sandbox="" referrerPolicy="no-referrer" srcDoc={previewResult.data.html} className="h-[600px] w-full border" />
      <details className="mt-3"><summary>Plain text preview</summary><pre className="mt-2 whitespace-pre-wrap break-words">{previewResult.data.text}</pre></details>
    </AdminCard> : null}
    <h2 className="mb-3 mt-6">Delivery summary</h2>
    <AdminSummaryStrip items={[
      { label: "Sent", value: summary.sent }, { label: "Failed", value: summary.failed },
      { label: "Unknown", value: summary.unknown }, { label: "Pending", value: summary.pending },
      { label: "Skipped", value: summary.skipped }, { label: "Redeemed", value: summary.redeemed },
    ]} />
    <p className="my-4 text-sm">Unknown means delivery is uncertain. Check the email provider before resending.</p>
    <h2 className="mb-3">Recent birthday offers</h2>
    <AdminCard padding={0} className="overflow-hidden">
      <ColumnPriorityTable fields={fields} rows={recent} getRowKey={(row) => row.id}
        emptyState={<AdminEmptyState title="No birthday offers yet" description="Recent delivery activity will appear here." />} />
    </AdminCard>
  </>;
}
