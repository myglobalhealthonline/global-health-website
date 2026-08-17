import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { CalendarCheck2 } from "lucide-react";
import {
  bookMeCorporateService,
  fetchMeCorporateService,
} from "@/lib/corporate/corporate-api";
import {
  AdminCard,
  AdminEmptyState,
  Btn,
  PageHeader,
  Pill,
  SectionHeader,
} from "@/components/portal-atoms";
import { getServerAuthUser } from "@/lib/api/server-auth";
import { getPortalLocale } from "@/lib/i18n/get-portal-locale";
import { loadLocaleBundle } from "@/lib/i18n/load-locale";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ error?: string }>;
};

async function bookAction(formData: FormData) {
  "use server";
  const id = String(formData.get("corporateServiceId") ?? "").trim();
  const back = (error: string) =>
    redirect(`/account/corporate/book/${id}?error=${encodeURIComponent(error)}`);

  const timeSlotId = String(formData.get("timeSlotId") ?? "").trim();
  const fullName = String(formData.get("fullName") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  if (!id || !timeSlotId || !fullName || !email) {
    back("Pick a time and check your name and email");
  }
  if (formData.get("consentAccepted") !== "on") {
    back("Consent is required to book");
  }

  const phone = String(formData.get("phone") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();
  const result = await bookMeCorporateService(id, {
    timeSlotId,
    fullName,
    email,
    ...(phone ? { phone } : {}),
    ...(notes ? { notes } : {}),
    consentAccepted: true,
  });
  if (!result.ok) back(result.message);

  revalidatePath("/account/corporate");
  redirect(
    `/account/corporate?success=${encodeURIComponent("Consultation booked — check your email for the confirmation.")}`,
  );
}

/** Slots arrive flat and chronological; the picker groups them by calendar day
 *  so a 60-day window is navigable in one native select. */
function groupByDay(slots: { id: string; startAt: string }[], locale: string) {
  const groups = new Map<string, { id: string; label: string }[]>();
  for (const slot of slots) {
    const start = new Date(slot.startAt);
    const day = start.toLocaleDateString(locale, {
      weekday: "long",
      day: "numeric",
      month: "long",
    });
    const time = start.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });
    const bucket = groups.get(day);
    if (bucket) bucket.push({ id: slot.id, label: time });
    else groups.set(day, [{ id: slot.id, label: time }]);
  }
  return [...groups.entries()];
}

export default async function CorporateBookPage({ params, searchParams }: PageProps) {
  const [{ id }, sp, locale, user] = await Promise.all([
    params,
    searchParams ? searchParams : Promise.resolve({} as { error?: string }),
    getPortalLocale(),
    getServerAuthUser(),
  ]);
  const t = loadLocaleBundle(locale).account.corporate;
  const result = await fetchMeCorporateService(id);

  if (!result.ok || !result.data) {
    return (
      <>
        <PageHeader eyebrow={t.eyebrow} title={t.bookTitle} />
        <AdminEmptyState
          as="h2"
          icon={<CalendarCheck2 className="size-8" aria-hidden />}
          title={t.bookUnavailable}
          description={result.ok ? "" : result.message}
        />
        <div className="mt-4">
          <Btn href="/account/corporate" variant="secondary" size="sm">
            {t.backToMembership}
          </Btn>
        </div>
      </>
    );
  }

  const { service, slots, companyLive } = result.data;
  const days = groupByDay(slots, locale);
  // No assigned doctor (deactivated), no times, or a company whose contract
  // has lapsed — all three mean the form must not be submittable, and each
  // gets its own message rather than an empty picker.
  const bookable = Boolean(service.doctor) && slots.length > 0 && companyLive;

  return (
    <>
      <PageHeader
        eyebrow={t.eyebrow}
        title={service.name}
        description={
          service.doctor
            ? `${t.bookWith.replace("{doctor}", service.doctor.fullName)} · ${t.bookDuration.replace(
                "{minutes}",
                String(service.durationMinutes),
              )}`
            : t.bookDuration.replace("{minutes}", String(service.durationMinutes))
        }
        actions={<Pill tone="active">{t.bookFree}</Pill>}
      />

      {sp.error ? (
        <p className="gh-status-warning mb-4 rounded-md border px-4 py-3 text-sm">{sp.error}</p>
      ) : null}
      {!companyLive ? (
        <p className="gh-status-warning mb-4 rounded-md border px-4 py-3 text-sm">
          {t.inactiveNotice}
        </p>
      ) : null}

      <AdminCard padding={0} className="overflow-hidden">
        <SectionHeader as="h2" title={t.bookChooseTime} description={service.description ?? ""} />
        {!bookable ? (
          <p className="px-5 py-4 text-sm text-[var(--color-text-muted)]">
            {companyLive ? t.bookNoTimes : t.inactiveNotice}
          </p>
        ) : (
          <form
            action={bookAction}
            className="grid grid-cols-1 gap-3 border-t border-[var(--color-border)] px-5 py-4 sm:grid-cols-2"
          >
            <input type="hidden" name="corporateServiceId" value={service.id} />

            <label className="flex flex-col gap-1 sm:col-span-2">
              <span className="gh-field-label">{t.bookChooseTime} *</span>
              <select name="timeSlotId" required defaultValue="" className="gh-select">
                <option value="" disabled>
                  {t.select}
                </option>
                {days.map(([day, times]) => (
                  <optgroup key={day} label={day}>
                    {times.map((slot) => (
                      <option key={slot.id} value={slot.id}>
                        {slot.label}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </label>

            <p className="gh-field-label sm:col-span-2">{t.bookYourDetails}</p>

            <label className="flex flex-col gap-1">
              <span className="gh-field-label">{t.bookFullName} *</span>
              <input
                name="fullName"
                required
                maxLength={240}
                defaultValue={user?.fullName ?? ""}
                className="gh-input"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="gh-field-label">{t.email} *</span>
              <input
                name="email"
                type="email"
                required
                maxLength={320}
                defaultValue={user?.email ?? ""}
                className="gh-input"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="gh-field-label">{t.phoneWhatsApp}</span>
              <input name="phone" maxLength={40} className="gh-input" />
            </label>
            <label className="flex flex-col gap-1 sm:col-span-2">
              <span className="gh-field-label">{t.bookNotes}</span>
              <textarea name="notes" maxLength={4000} rows={3} className="gh-input" />
            </label>

            <label className="flex items-start gap-2 sm:col-span-2">
              <input type="checkbox" name="consentAccepted" required className="mt-1" />
              <span className="text-sm text-[var(--color-text-body)]">{t.bookConsent}</span>
            </label>

            <div className="flex justify-end gap-2 sm:col-span-2">
              <Btn href="/account/corporate" variant="ghost" size="sm">
                {t.backToMembership}
              </Btn>
              <Btn type="submit" variant="primary" size="sm">
                {t.bookSubmit}
              </Btn>
            </div>
          </form>
        )}
      </AdminCard>
    </>
  );
}
