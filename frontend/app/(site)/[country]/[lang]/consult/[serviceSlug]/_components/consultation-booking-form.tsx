"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useParams, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useCart } from "@/components/cart/CartContext";
import type { CartItemKind } from "@/lib/api/cart-types";
import { fetchCurrentUser, type AuthUser } from "@/lib/api/auth-api";
import { formatAppDate, formatAppTime } from "@/lib/format-datetime";

type Slot = { id: string; startAt: string; endAt: string };

type Props = {
  doctorId: string;
  doctorName: string;
  serviceId: string;
  kind: Extract<CartItemKind, "GENERAL_CONSULTATION" | "SPECIALIST_CONSULTATION">;
  slots: Slot[];
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
}: Props) {
  const router = useRouter();
  const params = useParams<{ country: string; lang: string }>();
  const { add } = useCart();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const nationalIdLabel = idLabelForCountrySlug(params?.country);

  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(
    slots[0]?.id ?? null,
  );
  // Date-first UX — pick the day, then the times for that day render
  // below. Defaults to the day of the pre-selected slot (which is the
  // first slot in the list), so the panel is never empty on first
  // render.
  const [selectedDay, setSelectedDay] = useState<string | null>(
    slots[0] ? formatAppDate(slots[0].startAt) : null,
  );

  // Auth + prefill state. We render the form unconditionally so guests
  // can still book — when signed in we fill the defaults from /api/auth/me.
  const [me, setMe] = useState<AuthUser | null>(null);
  const [authLoaded, setAuthLoaded] = useState(false);
  const [bookingForOther, setBookingForOther] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const res = await fetchCurrentUser();
      if (cancelled) return;
      if (res.ok) setMe(res.data.user);
      setAuthLoaded(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const defaults = useMemo(() => {
    if (!me || bookingForOther) {
      // Guest, or signed-in user booking for someone else.
      return {
        fullName: "",
        email: me?.email ?? "",
        phone: "",
        dateOfBirth: "",
      };
    }
    return {
      fullName: me.fullName ?? "",
      email: me.email ?? "",
      phone: me.phone ?? "",
      dateOfBirth: me.dateOfBirth ? me.dateOfBirth.slice(0, 10) : "",
    };
  }, [me, bookingForOther]);

  // Group slots by local day for display.
  const grouped = useMemo(() => {
    const map = new Map<string, Slot[]>();
    for (const s of slots) {
      const day = formatAppDate(s.startAt);
      const list = map.get(day) ?? [];
      list.push(s);
      map.set(day, list);
    }
    return map;
  }, [slots]);

  const maxDob = new Date().toISOString().slice(0, 10);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (!selectedSlotId) {
      setError("Pick a time slot before continuing.");
      return;
    }

    const form = new FormData(e.currentTarget);
    const fullName = String(form.get("fullName") ?? "").trim();
    const email = String(form.get("email") ?? "").trim();
    const phone = String(form.get("phone") ?? "").trim();
    const dateOfBirth = String(form.get("dateOfBirth") ?? "").trim();
    const notes = String(form.get("notes") ?? "").trim();
    const nationalIdNumber = String(form.get("nationalIdNumber") ?? "").trim();
    const consent = form.get("consent") === "on";

    if (fullName.length < 2) {
      setError("Enter the patient full name.");
      return;
    }
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      setError("Enter a valid email address.");
      return;
    }
    if (!consent) {
      setError("You need to accept the consent statement to continue.");
      return;
    }

    startTransition(async () => {
      const res = await add({
        kind,
        serviceId,
        doctorId,
        timeSlotId: selectedSlotId,
        patient: {
          fullName,
          email,
          phone: phone || undefined,
          dateOfBirth: dateOfBirth || undefined,
          notes: notes || undefined,
          consentAccepted: true,
          bookingForOther,
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
      if (me && !bookingForOther && nationalIdNumber) {
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
      <p className="mt-4 text-sm text-slate-500">
        No open slots in the next 14 days for {doctorName}.
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
  const formKey = `${bookingForOther ? "other" : "self"}:${me?.id ?? (authLoaded ? "guest" : "loading")}`;

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
            Pick a date
          </p>
          <p className="text-xs text-[var(--color-text-muted)]">
            {grouped.size} {grouped.size === 1 ? "day" : "days"} available · times in your timezone
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
              ? date.toLocaleDateString(undefined, { weekday: "short" })
              : "";
            const dayNum = date ? date.getDate() : "";
            const month = date
              ? date.toLocaleDateString(undefined, { month: "short" })
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
                  {daySlots.length} {daySlots.length === 1 ? "slot" : "slots"}
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
              Pick a time on {selectedDay}
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
                        ? "inline-flex items-center justify-center rounded-xl border-2 border-[var(--color-brand-primary)] bg-[var(--color-brand-primary)] text-white px-3 py-3 text-sm font-semibold [font-variant-numeric:tabular-nums] shadow-[var(--shadow-card)]"
                        : "inline-flex items-center justify-center rounded-xl border border-[var(--color-border)] bg-[var(--color-background-page)] text-[var(--color-text-primary)] px-3 py-3 text-sm font-semibold [font-variant-numeric:tabular-nums] transition-[border-color,background-color,transform] duration-200 hover:border-[var(--color-brand-primary)] hover:bg-[var(--color-background-soft)] active:scale-[0.97] motion-reduce:transition-none motion-reduce:active:scale-100 disabled:opacity-60"
                    }
                  >
                    {formatAppTime(s.startAt)}
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}
      </div>

      {/* 2. Patient details — prefilled from account when signed in. */}
      <fieldset className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
        <legend className="px-2 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">
          Patient details
        </legend>
        {me ? (
          <label className="mt-1 flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={bookingForOther}
              onChange={(e) => setBookingForOther(e.target.checked)}
              className="size-4 rounded border-slate-300"
            />
            Booking for someone else (clears the patient fields — your account
            details stay intact)
          </label>
        ) : null}

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-xs font-semibold text-slate-700">
              Patient full name
            </span>
            <input
              type="text"
              name="fullName"
              required
              minLength={2}
              maxLength={120}
              defaultValue={defaults.fullName}
              className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
            />
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-slate-700">Email</span>
            <input
              type="email"
              name="email"
              required
              defaultValue={defaults.email}
              className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
            />
            {bookingForOther ? (
              <p className="mt-1 text-xs text-slate-500">
                Booking confirmations + receipts go here. Edit if the patient
                wants their own copy.
              </p>
            ) : null}
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-slate-700">Phone</span>
            <input
              type="tel"
              name="phone"
              maxLength={40}
              placeholder="+353 89 …"
              defaultValue={defaults.phone}
              className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
            />
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-slate-700">
              Date of birth
            </span>
            <input
              type="date"
              name="dateOfBirth"
              max={maxDob}
              defaultValue={defaults.dateOfBirth}
              suppressHydrationWarning
              className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
            />
          </label>
        </div>

        <label className="mt-4 block">
          <span className="text-xs font-semibold text-slate-700">
            {nationalIdLabel} (optional)
          </span>
          <input
            type="text"
            name="nationalIdNumber"
            maxLength={64}
            className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
          />
          <p className="mt-1 text-xs text-slate-500">
            Needed on prescriptions in your country. You can also fill it
            in on your profile later.
          </p>
        </label>

        <label className="mt-4 block">
          <span className="text-xs font-semibold text-slate-700">
            Reason for visit (optional)
          </span>
          <textarea
            name="notes"
            rows={3}
            maxLength={2000}
            placeholder="Briefly describe your symptoms or what you'd like to discuss."
            className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
          />
        </label>

        <label className="mt-4 flex items-start gap-2 text-xs text-slate-700">
          <input
            type="checkbox"
            name="consent"
            required
            className="mt-0.5 size-4 rounded border-slate-300"
          />
          <span>
            I confirm the details above are accurate and consent to a video
            consultation with the selected clinician.
          </span>
        </label>
      </fieldset>

      {error ? (
        <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
          {error}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={pending || !authLoaded}
        className="inline-flex items-center justify-center gap-2 rounded-md bg-emerald-700 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-800 disabled:opacity-60"
      >
        {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
        {pending ? "Adding to cart…" : "Continue to cart"}
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
