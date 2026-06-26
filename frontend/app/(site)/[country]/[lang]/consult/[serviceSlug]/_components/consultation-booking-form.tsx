"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useParams, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useCart } from "@/components/cart/CartContext";
import type { CartItemKind } from "@/lib/api/cart-types";
import { fetchCurrentUser, type AuthUser } from "@/lib/api/auth-api";
import { listFamilyMembers, type FamilyMember } from "@/lib/api/family-client";
import { formatAppDate, formatAppTime } from "@/lib/format-datetime";
import { formatPriceRounded } from "@/lib/format-currency";
import { PhoneField } from "@/components/forms/phone-field";
import { dialCodeForCountrySlug } from "@/lib/phone/dial-codes";
import type { CommonLocale } from "@/lib/i18n/types";

type Slot = {
  id: string;
  startAt: string;
  endAt: string;
  priceCents?: number;
  pricingType?: "STANDARD" | "PEAK" | "OFF_PEAK";
  currencyCode?: string;
};

type Props = {
  doctorId: string;
  doctorName: string;
  serviceId: string;
  kind: Extract<CartItemKind, "GENERAL_CONSULTATION" | "SPECIALIST_CONSULTATION">;
  slots: Slot[];
  /** Clinic timezone the slots are in. Patient sees clinic-local times so
   *  "09:00" reads the same to patient, doctor, and clinic. */
  clinicTimezone?: string;
  /** Optional deep-link slot id. Used by /book and /consult when the
   *  server has already verified the service + doctor context. */
  initialSlotId?: string | null;
  i18n: CommonLocale["bookingForm"];
};

/**
 * Cart-first booking form.
 *
 * Lives on the consult page (`/[country]/[lang]/consult/[serviceSlug]?doctor=<slug>`)
 * and collects everything the backend needs to mint a paid Appointment:
 *
 *   1. Slot pick (mandatory — the slot is the inventory unit).
 *   2. Patient details (name, email, phone, DOB, notes, consent).
 *
 * Submit POSTs to `/api/cart/items` with kind/serviceId/doctorId/timeSlotId
 * + the patient snapshot. Backend snapshots it onto the CartItem so
 * checkout → Stripe → webhook can mint the Appointment without
 * re-collecting any of this at payment time.
 *
 * Signed-in patients see their account name/email/phone/DOB prefilled.
 * "Booking for someone else" clears patient fields (keeps email
 * editable as the payer contact) and does NOT touch account DOB.
 */
export function ConsultationBookingForm({
  doctorId,
  doctorName,
  serviceId,
  kind,
  slots,
  clinicTimezone,
  initialSlotId,
  i18n,
}: Props) {
  const router = useRouter();
  const params = useParams<{ country: string; lang: string }>();
  const { add } = useCart();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Clinic timezone drives all slot display so the patient sees the same
  // wall-clock the clinic + doctor use. Falls back to the app default when a
  // caller (e.g. the legacy book-online path) doesn't supply one.
  const tz = clinicTimezone ?? "Europe/Dublin";
  const tzLabel = tz.includes("/")
    ? tz.slice(tz.lastIndexOf("/") + 1).replace(/_/g, " ")
    : tz;

  const nationalIdLabel = idLabelForCountrySlug(params?.country);
  const initialSlot =
    (initialSlotId ? slots.find((slot) => slot.id === initialSlotId) : undefined) ??
    slots[0] ??
    null;

  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(
    initialSlot?.id ?? null,
  );
  // Date-first UX — pick the day, then the times for that day render
  // below. Defaults to the day of the pre-selected slot (which is the
  // first slot in the list), so the panel is never empty on first
  // render.
  const [selectedDay, setSelectedDay] = useState<string | null>(
    initialSlot ? formatAppDate(initialSlot.startAt, tz) : null,
  );

  // Auth + prefill state. We render the form unconditionally so guests
  // can still book — when signed in we fill the defaults from /api/auth/me.
  const [me, setMe] = useState<AuthUser | null>(null);
  const [authLoaded, setAuthLoaded] = useState(false);
  const [bookingForOther, setBookingForOther] = useState(false);
  // Approved dependents the logged-in patient can book for (Premium family
  // usage). Only those approved to use plan benefits (canUseCredits) appear.
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [selectedFamilyId, setSelectedFamilyId] = useState("");

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const res = await fetchCurrentUser();
      if (cancelled) return;
      if (res.ok) {
        setMe(res.data.user);
        // Pull the patient's approved family list so they can book for a
        // dependent and apply the plan benefit. Best-effort — failure just
        // hides the selector.
        const fam = await listFamilyMembers();
        if (!cancelled && fam.ok) setFamilyMembers(fam.data.items);
      }
      setAuthLoaded(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const approvedMembers = useMemo(
    () => familyMembers.filter((m) => m.canUseCredits),
    [familyMembers],
  );
  const selectedMember =
    approvedMembers.find((m) => m.id === selectedFamilyId) ?? null;
  // "Treating someone other than the account holder" — either the manual
  // free-text toggle OR an approved family member chosen from the dropdown.
  const treatingOther = bookingForOther || Boolean(selectedMember);

  const defaults = useMemo(() => {
    if (!me) {
      return { fullName: "", email: "", phone: "", dateOfBirth: "" };
    }
    return {
      fullName: me.fullName ?? "",
      email: me.email ?? "",
      phone: me.phone ?? "",
      dateOfBirth: me.dateOfBirth ? me.dateOfBirth.slice(0, 10) : "",
    };
  }, [me]);

  // Group slots by local day for display.
  const grouped = useMemo(() => {
    const map = new Map<string, Slot[]>();
    for (const s of slots) {
      const day = formatAppDate(s.startAt, tz);
      const list = map.get(day) ?? [];
      list.push(s);
      map.set(day, list);
    }
    return map;
  }, [slots, tz]);

  const maxDob = new Date().toISOString().slice(0, 10);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (!selectedSlotId) {
      setError(i18n.pickSlotError);
      return;
    }

    const form = new FormData(e.currentTarget);
    const fullName = String(form.get("fullName") ?? "").trim();
    const email = String(form.get("email") ?? "").trim();
    const phone = String(form.get("phone") ?? "").trim();
    const dateOfBirth = String(form.get("dateOfBirth") ?? "").trim();
    const notes = String(form.get("notes") ?? "").trim();
    const patientOtherName = bookingForOther ? String(form.get("patientOtherName") ?? "").trim() : "";
    const patientOtherPhone = bookingForOther ? String(form.get("patientOtherPhone") ?? "").trim() : "";
    const patientOtherDob = bookingForOther ? String(form.get("patientOtherDob") ?? "").trim() : "";
    const nationalIdNumber = String(form.get("nationalIdNumber") ?? "").trim();
    const addressLine1 = String(form.get("addressLine1") ?? "").trim();
    const addressLine2 = String(form.get("addressLine2") ?? "").trim();
    const addressCity = String(form.get("addressCity") ?? "").trim();
    const addressPostalCode = String(form.get("addressPostalCode") ?? "").trim();
    const addressCountryCode = (params?.country ?? "").slice(0, 2).toLowerCase();
    const consent = form.get("consent") === "on";
    const gdprConsentClinic = form.get("gdprConsentClinic") === "on";
    const gdprConsentPlatform = form.get("gdprConsentPlatform") === "on";

    if (!selectedMember && !bookingForOther && fullName.length < 2) {
      setError(i18n.enterFullName);
      return;
    }
    if (!selectedMember && bookingForOther && patientOtherName.length < 2) {
      setError("Enter the patient’s full name.");
      return;
    }
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      setError(i18n.enterValidEmail);
      return;
    }
    if (!consent) {
      setError(i18n.acceptConsent);
      return;
    }
    if (!gdprConsentClinic) {
      setError(i18n.acceptClinicConsent);
      return;
    }
    if (!gdprConsentPlatform) {
      setError(i18n.acceptPlatformConsent);
      return;
    }

    // IANA tz from browser. Falls back to undefined on the rare engine
    // that doesn't expose `resolvedOptions().timeZone` so the cart route
    // can default it from BookingSetting.timezone.
    let patientTimezone: string | undefined;
    try {
      patientTimezone =
        Intl.DateTimeFormat().resolvedOptions().timeZone || undefined;
    } catch {
      patientTimezone = undefined;
    }

    startTransition(async () => {
      // Resolve the patient identity. A selected family member's identity
      // comes from the approved dependent row; otherwise the manual
      // free-text "someone else" fields, otherwise the account holder.
      const patientName = selectedMember
        ? selectedMember.fullName
        : bookingForOther
          ? patientOtherName
          : fullName;
      const patientDob = selectedMember
        ? selectedMember.dateOfBirth?.slice(0, 10) || undefined
        : (bookingForOther ? patientOtherDob : dateOfBirth) || undefined;
      const patientPhoneVal = selectedMember
        ? phone || undefined
        : (bookingForOther ? patientOtherPhone || phone : phone) || undefined;

      const res = await add({
        kind,
        serviceId,
        doctorId,
        timeSlotId: selectedSlotId,
        // Premium family usage — the line targets an approved dependent and
        // pre-selects the credit benefit (server re-verifies eligibility).
        ...(selectedMember
          ? { familyMemberId: selectedMember.id, benefitSelection: "USE_PLAN_CREDIT" as const }
          : {}),
        patient: {
          fullName: patientName,
          email,
          phone: patientPhoneVal,
          dateOfBirth: patientDob,
          notes: notes || undefined,
          consentAccepted: true,
          bookingForOther: treatingOther,
          nationalIdNumber: nationalIdNumber || undefined,
          patientTimezone,
          addressLine1: addressLine1 || undefined,
          addressLine2: addressLine2 || undefined,
          addressCity: addressCity || undefined,
          addressPostalCode: addressPostalCode || undefined,
          addressCountryCode: addressCountryCode || undefined,
          gdprConsentClinic: true,
          gdprConsentPlatform: true,
        },
      });
      if (!res.ok) {
        setError(res.message ?? "Could not add to cart");
        return;
      }
      // Persist the national ID onto the logged-in patient's
      // PatientProfile in the background. We deliberately don't `await`
      // here — if the backend's slow, the patient still gets redirected
      // to /cart in normal time. Failure is non-fatal; they can fill it
      // in later from /account/profile.
      if (me && !treatingOther && nationalIdNumber) {
        void fetch("/api/account/profile", {
          method: "PATCH",
          credentials: "include",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ nationalIdNumber }),
        }).catch(() => {});
      }
      const country = params?.country ?? "";
      const lang = params?.lang ?? "";
      // `?added=1` is the cue for the cart page to flash a green
      // "Added to cart" banner so the patient sees positive feedback
      // — the cart icon badge alone isn't loud enough.
      const dest =
        country && lang
          ? `/${country}/${lang}/cart?added=1`
          : "/cart?added=1";
      router.push(dest);
    });
  }

  if (slots.length === 0) {
    return (
      <p className="mt-4 text-sm text-[var(--color-text-muted)]">
        {i18n.noOpenSlots.replace("{doctor}", doctorName)}
      </p>
    );
  }

  // Form is uncontrolled (defaultValue inputs), so the field defaults
  // are captured at mount. `/api/auth/me` resolves async — without a
  // key that flips when auth lands, a signed-in patient who renders
  // the form before the fetch returns keeps blank fields until they
  // toggle "Booking for someone else" or refresh. Including the user
  // identity in the key forces a clean remount once auth resolves so
  // the prefilled defaults actually appear.
  const formKey = `${treatingOther ? "other" : "self"}:${selectedFamilyId || "none"}:${me?.id ?? (authLoaded ? "guest" : "loading")}`;

  return (
    <form
      key={formKey}
      onSubmit={onSubmit}
      className="mt-6 grid gap-6"
    >
      {/* 1. Slot picker — two-step: pick the day, then the times for
        * that day render below in a clean morning/afternoon/evening
        * grouped grid. Replaces the previous "wall of chips with day
        * headers" pattern which was overwhelming when 5+ days had 6+
        * slots each. */}
      <div>
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--color-text-muted)]">
            {i18n.pickDate}
          </p>
          <p className="text-xs text-[var(--color-text-muted)]">
            {i18n.daysAvailable
              .replace("{count}", String(grouped.size))
              .replace("{day}", grouped.size === 1 ? i18n.day : i18n.days)
              .replace("{tz}", tzLabel)}
          </p>
        </div>

        {/* Date pills row — horizontally scrollable so 14 days fit on
          * mobile without wrapping into a chaotic stack. Each pill:
          * weekday short, day number big, slot count tiny. */}
        <div
          role="tablist"
          aria-label="Available dates"
          className="mt-3 -mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:thin]"
        >
          {Array.from(grouped.entries()).map(([day, daySlots]) => {
            const isActive = selectedDay === day;
            const firstSlotAt = daySlots[0]?.startAt;
            const date = firstSlotAt ? new Date(firstSlotAt) : null;
            // Render compact: "Mon" on top, "12" big, "Aug" small.
            const weekday = date
              ? date.toLocaleDateString(undefined, { weekday: "short", timeZone: tz })
              : "";
            const dayNum = date
              ? date.toLocaleDateString(undefined, { day: "numeric", timeZone: tz })
              : "";
            const month = date
              ? date.toLocaleDateString(undefined, { month: "short", timeZone: tz })
              : "";
            return (
              <button
                key={day}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => {
                  setSelectedDay(day);
                  // Auto-select the first slot of the new day so the
                  // submit button never sits disabled after a date pick.
                  const first = daySlots[0];
                  if (first) setSelectedSlotId(first.id);
                }}
                disabled={pending}
                className={
                  isActive
                    ? "flex shrink-0 flex-col items-center gap-0.5 rounded-2xl border-2 border-[var(--color-brand-primary)] bg-[var(--color-brand-primary)] text-white px-4 py-3 min-w-[68px] shadow-[var(--shadow-card)]"
                    : "flex shrink-0 flex-col items-center gap-0.5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-background-page)] text-[var(--color-text-body)] px-4 py-3 min-w-[68px] transition-[border-color,background-color,transform] duration-200 hover:border-[var(--color-border-strong)] hover:bg-[var(--color-background-soft)] active:scale-[0.97] motion-reduce:transition-none motion-reduce:active:scale-100 disabled:opacity-60"
                }
              >
                <span
                  className={
                    isActive
                      ? "text-[10px] font-bold uppercase tracking-[0.12em] text-white/80"
                      : "text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--color-text-muted)]"
                  }
                >
                  {weekday}
                </span>
                <span
                  className={
                    isActive
                      ? "text-2xl font-bold leading-none [font-variant-numeric:tabular-nums] text-white"
                      : "text-2xl font-bold leading-none [font-variant-numeric:tabular-nums] text-[var(--color-text-primary)]"
                  }
                >
                  {dayNum}
                </span>
                <span
                  className={
                    isActive
                      ? "text-[10px] font-semibold uppercase tracking-[0.1em] text-white/70"
                      : "text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--color-text-muted)]"
                  }
                >
                  {month}
                </span>
                <span
                  className={
                    isActive
                      ? "mt-1 text-[10px] font-semibold text-white/80"
                      : "mt-1 text-[10px] font-semibold text-[var(--color-brand-primary)]"
                  }
                >
                  {daySlots.length} {daySlots.length === 1 ? i18n.slotSingular : i18n.slotPlural}
                </span>
              </button>
            );
          })}
        </div>

        {/* Time grid for the active day. Buttons in a responsive
          * grid (2 cols on mobile, 4 on lg) so they look like a
          * proper picker, not a sloppy wrap. */}
        {selectedDay ? (
          <div className="mt-6">
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--color-text-muted)]">
              {i18n.pickTimeOn.replace("{date}", selectedDay)}
            </p>
            <div
              role="tabpanel"
              aria-label={`Times on ${selectedDay}`}
              className="mt-3 grid gap-2 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4"
            >
              {(grouped.get(selectedDay) ?? []).map((s) => {
                const isSelected = selectedSlotId === s.id;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setSelectedSlotId(s.id)}
                    disabled={pending}
                    aria-pressed={isSelected}
                    className={
                      isSelected
                        ? "inline-flex flex-col items-center justify-center rounded-xl border-2 border-[var(--color-brand-primary)] bg-[var(--color-brand-primary)] text-white px-3 py-2.5 text-sm font-semibold [font-variant-numeric:tabular-nums] shadow-[var(--shadow-card)]"
                        : "inline-flex flex-col items-center justify-center rounded-xl border border-[var(--color-border)] bg-[var(--color-background-page)] text-[var(--color-text-primary)] px-3 py-2.5 text-sm font-semibold [font-variant-numeric:tabular-nums] transition-[border-color,background-color,transform] duration-200 hover:border-[var(--color-brand-primary)] hover:bg-[var(--color-background-soft)] active:scale-[0.97] motion-reduce:transition-none motion-reduce:active:scale-100 disabled:opacity-60"
                    }
                  >
                    <span>{formatAppTime(s.startAt, tz)}</span>
                    {typeof s.priceCents === "number" ? (
                      <span
                        className={
                          isSelected
                            ? "mt-0.5 text-xs font-medium text-white/85"
                            : "mt-0.5 text-xs font-medium text-[var(--color-text-muted)]"
                        }
                      >
                        {formatPriceRounded(s.priceCents, s.currencyCode ?? "EUR")}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}
      </div>

      {/* 2. Patient details — prefilled from account when signed in.
        * When bookingForOther, these fields remain the logged-in user's
        * contact/notification details. A separate sub-section collects
        * the actual patient (person being treated). */}
      <fieldset className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-background-page)] p-5 sm:p-6">
        <legend className="px-2 text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--color-text-muted)]">
          {treatingOther ? "Your contact details" : i18n.patientDetails}
        </legend>

        {/* Family-member targeting — book for an approved dependent and apply
          * the plan benefit. Shown only to logged-in patients with at least
          * one approved family member. */}
        {me && approvedMembers.length > 0 ? (
          <div className="mt-1">
            <label className="block">
              <span className="text-xs font-semibold text-[var(--color-text-body)]">
                {i18n.whoIsThisFor}
              </span>
              <select
                value={selectedFamilyId}
                onChange={(e) => {
                  setSelectedFamilyId(e.target.value);
                  // The dropdown and the manual toggle are mutually exclusive.
                  if (e.target.value) setBookingForOther(false);
                }}
                className="mt-1 block w-full rounded-md border border-[var(--color-border)] bg-[var(--color-background-page)] px-3 py-2 text-sm text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-primary)]/40"
              >
                <option value="">{i18n.forMe}</option>
                {approvedMembers.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.fullName}
                    {m.relationship ? ` (${m.relationship})` : ""}
                  </option>
                ))}
              </select>
            </label>
            {selectedMember ? (
              <p className="mt-1.5 text-xs text-[var(--color-text-muted)]">
                {i18n.familyBenefitNote}
              </p>
            ) : null}
            <Link
              href="/account/family"
              className="mt-1 inline-block text-xs font-semibold underline"
              style={{ color: "var(--color-brand-primary)" }}
            >
              {i18n.manageFamily}
            </Link>
          </div>
        ) : null}

        {/* Manual "someone else" path — only when not targeting a saved
          * family member (the two mechanisms are mutually exclusive). */}
        {me && !selectedMember ? (
          <label className="mt-2 flex items-center gap-2 text-sm text-[var(--color-text-body)]">
            <input
              type="checkbox"
              checked={bookingForOther}
              onChange={(e) => setBookingForOther(e.target.checked)}
              className="size-4 rounded border-[var(--color-border)]"
            />
            {i18n.bookingForOther}
          </label>
        ) : null}

        {/* Plan-benefit clarification (Req 5): booking for someone else is always
          * allowed (pay-as-you-go), but applying the plan's GP credits/discounts
          * to another person needs a family-enabled plan + an approved member.
          * Shown only when they opt into "someone else" with no such member. */}
        {me && bookingForOther && approvedMembers.length === 0 ? (
          <p className="mt-2 text-xs text-[var(--color-text-muted)]">
            {i18n.familyBenefitUnavailable}{" "}
            <Link
              href="/account/family"
              className="font-semibold underline"
              style={{ color: "var(--color-brand-primary)" }}
            >
              {i18n.manageFamily}
            </Link>
          </p>
        ) : null}

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {!treatingOther ? (
            <label className="block">
              <span className="text-xs font-semibold text-[var(--color-text-body)]">
                {i18n.patientFullName}
              </span>
              <input
                type="text"
                name="fullName"
                required
                minLength={2}
                maxLength={120}
                defaultValue={defaults.fullName}
                className="mt-1 block w-full rounded-md border border-[var(--color-border)] bg-[var(--color-background-page)] px-3 py-2 text-sm text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-primary)]/40"
              />
            </label>
          ) : null}
          <label className={`block${treatingOther ? " sm:col-span-2" : ""}`}>
            <span className="text-xs font-semibold text-[var(--color-text-body)]">
              {treatingOther ? "Your email (for confirmation)" : i18n.email}
            </span>
            <input
              type="email"
              name="email"
              required
              defaultValue={defaults.email}
              className="mt-1 block w-full rounded-md border border-[var(--color-border)] bg-[var(--color-background-page)] px-3 py-2 text-sm text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-primary)]/40"
            />
            {treatingOther ? (
              <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                {i18n.bookingConfirmationsNote}
              </p>
            ) : null}
          </label>
          {!treatingOther ? (
            <label className="block">
              <span className="text-xs font-semibold text-[var(--color-text-body)]">{i18n.phone}</span>
              <PhoneField
                name="phone"
                defaultValue={defaults.phone}
                defaultDial={dialCodeForCountrySlug(params?.country)}
                placeholder="871234567"
                className="mt-1 flex gap-2"
                selectClassName="block rounded-md border border-[var(--color-border)] bg-[var(--color-background-page)] px-2 py-2 text-sm text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-primary)]/40"
                inputClassName="block w-full rounded-md border border-[var(--color-border)] bg-[var(--color-background-page)] px-3 py-2 text-sm text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-primary)]/40"
              />
            </label>
          ) : null}
          {!treatingOther ? (
            <label className="block">
              <span className="text-xs font-semibold text-[var(--color-text-body)]">
                {i18n.dateOfBirth}
              </span>
              <input
                type="date"
                name="dateOfBirth"
                max={maxDob}
                defaultValue={defaults.dateOfBirth}
                suppressHydrationWarning
                className="mt-1 block w-full rounded-md border border-[var(--color-border)] bg-[var(--color-background-page)] px-3 py-2 text-sm text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-primary)]/40"
              />
            </label>
          ) : null}
        </div>

        {/* Patient being treated — shown only when booking for someone else.
          * Name is required; email + phone are optional (e.g. a child may
          * not have their own email or phone number). */}
        {bookingForOther ? (
          <div className="mt-5 rounded-[var(--radius-card)] border border-[var(--color-brand-primary)]/20 bg-[var(--color-background-soft)] p-4">
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--color-brand-primary)]">
              Patient being treated
            </p>
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              <label className="block sm:col-span-2">
                <span className="text-xs font-semibold text-[var(--color-text-body)]">
                  Patient full name
                </span>
                <input
                  type="text"
                  name="patientOtherName"
                  required
                  minLength={2}
                  maxLength={120}
                  className="mt-1 block w-full rounded-md border border-[var(--color-border)] bg-[var(--color-background-page)] px-3 py-2 text-sm text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-primary)]/40"
                />
              </label>
              <label className="block">
                <span className="text-xs font-semibold text-[var(--color-text-body)]">
                  Patient email{" "}
                  <span className="text-[11px] font-normal text-[var(--color-text-muted)]">(optional)</span>
                </span>
                <input
                  type="email"
                  name="patientOtherEmail"
                  className="mt-1 block w-full rounded-md border border-[var(--color-border)] bg-[var(--color-background-page)] px-3 py-2 text-sm text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-primary)]/40"
                />
              </label>
              <label className="block">
                <span className="text-xs font-semibold text-[var(--color-text-body)]">
                  Patient phone{" "}
                  <span className="text-[11px] font-normal text-[var(--color-text-muted)]">(optional)</span>
                </span>
                <PhoneField
                  name="patientOtherPhone"
                  defaultDial={dialCodeForCountrySlug(params?.country)}
                  placeholder="871234567"
                  className="mt-1 flex gap-2"
                  selectClassName="block rounded-md border border-[var(--color-border)] bg-[var(--color-background-page)] px-2 py-2 text-sm text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-primary)]/40"
                  inputClassName="block w-full rounded-md border border-[var(--color-border)] bg-[var(--color-background-page)] px-3 py-2 text-sm text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-primary)]/40"
                />
              </label>
              <label className="block">
                <span className="text-xs font-semibold text-[var(--color-text-body)]">
                  Date of birth{" "}
                  <span className="text-[11px] font-normal text-[var(--color-text-muted)]">(optional)</span>
                </span>
                <input
                  type="date"
                  name="patientOtherDob"
                  max={maxDob}
                  suppressHydrationWarning
                  className="mt-1 block w-full rounded-md border border-[var(--color-border)] bg-[var(--color-background-page)] px-3 py-2 text-sm text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-primary)]/40"
                />
              </label>
            </div>
          </div>
        ) : null}

        <label className="mt-4 block">
          <span className="text-xs font-semibold text-[var(--color-text-body)]">
            {i18n.nationalIdOptional.replace("{label}", nationalIdLabel)}
          </span>
          <input
            type="text"
            name="nationalIdNumber"
            maxLength={64}
            className="mt-1 block w-full rounded-md border border-[var(--color-border)] bg-[var(--color-background-page)] px-3 py-2 text-sm text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-primary)]/40"
          />
          <p className="mt-1 text-xs text-[var(--color-text-muted)]">
            {i18n.nationalIdHint}
          </p>
        </label>

        <label className="mt-4 block">
          <span className="text-xs font-semibold text-[var(--color-text-body)]">
            {i18n.reasonForVisit}
          </span>
          <textarea
            name="notes"
            rows={3}
            maxLength={2000}
            placeholder={i18n.reasonPlaceholder}
            className="mt-1 block w-full rounded-md border border-[var(--color-border)] bg-[var(--color-background-page)] px-3 py-2 text-sm text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-primary)]/40"
          />
        </label>

        <label className="mt-4 flex items-start gap-2 text-xs text-[var(--color-text-muted)]">
          <input
            type="checkbox"
            name="consent"
            required
            className="mt-0.5 size-4 rounded border-[var(--color-border)]"
          />
          <span>
            {i18n.consentStatement}
          </span>
        </label>
      </fieldset>

      {/* 3. Patient address — required when the country's BookingSetting
        * has requireAddress on. Snapshotted onto the appointment so the
        * clinical record + any prescription dispatch has the address as
        * it stood at booking, even if the patient later edits their
        * profile. Country code is implicit from the URL slug. */}
      <fieldset className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-background-page)] p-5 sm:p-6">
        <legend className="px-2 text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--color-text-muted)]">
          {i18n.patientAddress}
        </legend>
        <p className="mt-1 text-xs text-[var(--color-text-muted)]">
          {i18n.patientAddressNote}
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="block sm:col-span-2">
            <span className="text-xs font-semibold text-[var(--color-text-body)]">
              {i18n.streetAddress}
            </span>
            <input
              type="text"
              name="addressLine1"
              maxLength={120}
              autoComplete="address-line1"
              className="mt-1 block w-full rounded-md border border-[var(--color-border)] bg-[var(--color-background-page)] px-3 py-2 text-sm text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-primary)]/40"
            />
          </label>
          <label className="block sm:col-span-2">
            <span className="text-xs font-semibold text-[var(--color-text-body)]">
              {i18n.aptUnit}
            </span>
            <input
              type="text"
              name="addressLine2"
              maxLength={120}
              autoComplete="address-line2"
              className="mt-1 block w-full rounded-md border border-[var(--color-border)] bg-[var(--color-background-page)] px-3 py-2 text-sm text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-primary)]/40"
            />
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-[var(--color-text-body)]">{i18n.city}</span>
            <input
              type="text"
              name="addressCity"
              maxLength={80}
              autoComplete="address-level2"
              className="mt-1 block w-full rounded-md border border-[var(--color-border)] bg-[var(--color-background-page)] px-3 py-2 text-sm text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-primary)]/40"
            />
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-[var(--color-text-body)]">
              {i18n.postalCode}
            </span>
            <input
              type="text"
              name="addressPostalCode"
              maxLength={20}
              autoComplete="postal-code"
              className="mt-1 block w-full rounded-md border border-[var(--color-border)] bg-[var(--color-background-page)] px-3 py-2 text-sm text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-primary)]/40"
            />
          </label>
        </div>
      </fieldset>

      {/* 4. GDPR — two independent required checkboxes per legal review.
        * Stored separately on Appointment so withdrawal of marketing
        * consent (gdprConsentPlatform) doesn't invalidate the clinical
        * record (gdprConsentClinic). Wording deliberately scopes each
        * one's purpose to make withdrawal scope unambiguous. */}
      <fieldset className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-background-page)] p-5 sm:p-6">
        <legend className="px-2 text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--color-text-muted)]">
          {i18n.gdprConsent}
        </legend>
        <label className="mt-2 flex items-start gap-2 text-xs text-[var(--color-text-muted)]">
          <input
            type="checkbox"
            name="gdprConsentClinic"
            required
            className="mt-0.5 size-4 rounded border-[var(--color-border)]"
          />
          <span>{i18n.gdprClinicConsent}</span>
        </label>
        <label className="mt-3 flex items-start gap-2 text-xs text-[var(--color-text-muted)]">
          <input
            type="checkbox"
            name="gdprConsentPlatform"
            required
            className="mt-0.5 size-4 rounded border-[var(--color-border)]"
          />
          <span>{i18n.gdprPlatformConsent}</span>
        </label>
      </fieldset>

      {error ? (
        <div
          className="rounded-[var(--radius-card)] px-4 py-3 text-sm font-medium"
          style={{
            background: "rgba(239,68,68,0.08)",
            border: "1px solid rgba(239,68,68,0.25)",
            color: "var(--color-text-primary)",
          }}
        >
          {error}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={pending || !authLoaded}
        className="gh2-btn-lime w-full justify-center disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
        {pending ? i18n.addingToCart : i18n.continueToCart}
      </button>
    </form>
  );
}

/** Label the national-ID field per market. Defaults to "ID number" so
 *  patients in markets we haven't mapped yet still get a sensible prompt. */
function idLabelForCountrySlug(slug: string | undefined): string {
  if (!slug) return "ID number";
  const lower = slug.toLowerCase();
  if (lower.startsWith("portugal")) return "NIF / Cartão de Cidadão";
  if (lower.startsWith("brazil")) return "CPF";
  if (lower.startsWith("spain")) return "DNI / NIE";
  if (lower.startsWith("ireland")) return "PPS number";
  if (lower.startsWith("czech")) return "Rodné číslo";
  if (lower.startsWith("romania")) return "CNP";
  return "ID number";
}
