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

  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(
    slots[0]?.id ?? null,
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
      const country = params?.country ?? "";
      const lang = params?.lang ?? "";
      router.push(country && lang ? `/${country}/${lang}/cart` : "/cart");
    });
  }

  if (slots.length === 0) {
    return (
      <p className="mt-4 text-sm text-slate-500">
        No open slots in the next 14 days for {doctorName}.
      </p>
    );
  }

  return (
    <form
      key={bookingForOther ? "other" : "self"}
      onSubmit={onSubmit}
      className="mt-6 grid gap-6"
    >
      {/* 1. Slot picker — single-select. */}
      <div>
        <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">
          Pick a time
        </p>
        <div className="mt-3 grid gap-4">
          {Array.from(grouped.entries()).map(([day, daySlots]) => (
            <div key={day}>
              <p className="text-sm font-semibold text-slate-700">{day}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {daySlots.map((s) => {
                  const isSelected = selectedSlotId === s.id;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setSelectedSlotId(s.id)}
                      disabled={pending}
                      className={
                        isSelected
                          ? "inline-flex items-center gap-1.5 rounded-full border-2 border-emerald-500 bg-emerald-600 px-3 py-1.5 text-[13px] font-semibold text-white shadow-sm"
                          : "inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-[13px] font-semibold text-emerald-800 transition hover:border-emerald-400 hover:bg-emerald-100 disabled:opacity-60"
                      }
                    >
                      {formatAppTime(s.startAt)}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
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
