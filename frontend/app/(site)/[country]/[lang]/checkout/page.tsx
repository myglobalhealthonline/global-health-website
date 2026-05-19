"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useCart } from "@/components/cart/CartContext";
import { startCheckout } from "@/lib/api/cart-client";
import {
  fetchCurrentUser,
  patchCurrentUser,
  type AuthUser,
} from "@/lib/api/auth-api";
import { formatPrice } from "@/lib/format-currency";

/** Trim a full ISO datetime down to the YYYY-MM-DD an <input type="date">
 *  expects. The saved DOB is start-of-day UTC; the date input only
 *  cares about the date portion. */
function isoToDateInput(iso: string | null): string {
  if (!iso) return "";
  return iso.slice(0, 10);
}

export default function CheckoutPage() {
  const router = useRouter();
  const params = useParams<{ country: string; lang: string }>();
  const { cart, loading } = useCart();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [me, setMe] = useState<AuthUser | null>(null);
  const [authLoaded, setAuthLoaded] = useState(false);
  // "Booking for someone else" — flips the patient identity fields
  // (name, phone, DOB) to blank but keeps the email as the buyer's so
  // confirmation / payment emails reach the signed-in user. Email
  // stays editable too in case they want to send to a different
  // address.
  const [bookingForOther, setBookingForOther] = useState(false);

  // Best-effort fetch of the signed-in user. Guests get null, render
  // empty defaults — same path as before this change.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetchCurrentUser();
      if (cancelled) return;
      setMe(res.ok ? res.data.user : null);
      setAuthLoaded(true);
    })().catch(() => {
      if (!cancelled) setAuthLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // What to seed each field with. When "booking for someone else" is
  // on, patient identity fields go blank; email stays prefilled (the
  // buyer is paying — confirmation should still hit their inbox).
  const defaults = useMemo(() => {
    const dob = me ? isoToDateInput(me.dateOfBirth) : "";
    return {
      fullName: bookingForOther ? "" : me?.fullName ?? "",
      email: me?.email ?? "",
      phone: bookingForOther ? "" : me?.phone ?? "",
      dateOfBirth: bookingForOther ? "" : dob,
    };
  }, [me, bookingForOther]);
  // Route segments carry the active country/lang; build URLs from them
  // so back-links + Stripe return-URLs keep the country prefix.
  const countrySlug = params?.country ?? "";
  const lang = params?.lang ?? "";
  const cartHref = countrySlug && lang ? `/${countrySlug}/${lang}/cart` : "/cart";
  const returnTo =
    countrySlug && lang ? `/${countrySlug}/${lang}/checkout` : "/checkout";

  useEffect(() => {
    if (!loading && cart.items.length === 0) {
      router.replace(cartHref);
    }
  }, [loading, cart.items.length, router, cartHref]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = new FormData(e.currentTarget);
    setSubmitting(true);

    // Opportunistically persist a DOB the patient typed in. Only when:
    //   - signed in (we have a user to patch)
    //   - not booking for someone else (the DOB they typed is THEIRS)
    //   - the field actually has a value
    //   - the saved DOB differs from what they typed
    // Best-effort: don't block checkout if the PATCH fails.
    const typedDob = String(form.get("dateOfBirth") ?? "").trim();
    if (me && !bookingForOther && typedDob) {
      const savedDob = isoToDateInput(me.dateOfBirth);
      if (typedDob !== savedDob) {
        try {
          await patchCurrentUser({ dateOfBirth: typedDob });
        } catch {
          // Swallow — Stripe handoff is the critical path. Worst
          // case the patient resaves DOB from /account/profile.
        }
      }
    }

    const res = await startCheckout({
      email: String(form.get("email") ?? ""),
      fullName: String(form.get("fullName") ?? ""),
      phone: String(form.get("phone") ?? "") || undefined,
      shipName: String(form.get("shipName") ?? ""),
      shipLine1: String(form.get("shipLine1") ?? ""),
      shipLine2: String(form.get("shipLine2") ?? "") || undefined,
      shipCity: String(form.get("shipCity") ?? ""),
      shipPostalCode: String(form.get("shipPostalCode") ?? ""),
      shipCountryCode: String(form.get("shipCountryCode") ?? cart.countryCode),
      // Stripe success/cancel URLs are built as `${returnTo}/success`
      // and `${returnTo}/cancelled` on the backend — pass the
      // country-scoped path so the user lands back inside their
      // country segment.
      returnTo,
    });
    if (!res.ok) {
      setSubmitting(false);
      setError(res.message);
      return;
    }
    window.location.assign(res.data.url);
  }

  if (loading || !authLoaded) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
        <p className="text-sm text-slate-500">Loading…</p>
      </main>
    );
  }

  if (cart.items.length === 0) return null;

  // Mirror cart-page math: sum admin-set shipping per line. 0 for
  // online consultations, set by admin per item for physical things.
  const shippingCents = cart.items.reduce(
    (s, i) => s + (i.shippingCents ?? 0) * i.quantity,
    0,
  );
  const total = cart.subtotalCents + shippingCents;
  // Shipping address gate. HEALTH_TEST kits always ship physically
  // (we post a sample container). For other kinds we only ask for an
  // address when the admin set a non-zero shipping fee on the item —
  // online consultations + zero-shipping prescriptions skip the
  // section entirely so the patient doesn't fight a form they don't
  // need.
  const needsShipping = cart.items.some(
    (i) => i.kind === "HEALTH_TEST" || (i.shippingCents ?? 0) > 0,
  );

  return (
    <main className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
      <Link
        href={cartHref}
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-emerald-700 hover:underline"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Back to cart
      </Link>
      <h1 className="text-3xl font-bold text-slate-900 sm:text-4xl">Checkout</h1>
      <p className="mt-2 text-sm text-slate-500">
        {needsShipping
          ? `Shipping in ${cart.countryCode.toUpperCase()} · paid in ${cart.currencyCode}`
          : `Online services · paid in ${cart.currencyCode}`}
      </p>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_340px]">
        {/* `key` ties the form's defaultValue lifecycle to the
            "Booking for someone else" toggle so flipping it clears the
            uncontrolled inputs cleanly. Without it React keeps the old
            defaultValue render and the user has to clear by hand. */}
        <form
          key={bookingForOther ? "other" : "self"}
          onSubmit={onSubmit}
          className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <h2 className="text-lg font-bold text-slate-900">Contact & patient</h2>
            {me ? (
              <label className="inline-flex items-center gap-2 text-xs text-slate-600">
                <input
                  type="checkbox"
                  checked={bookingForOther}
                  onChange={(e) => setBookingForOther(e.target.checked)}
                  className="size-3.5 rounded border-slate-300"
                />
                Booking for someone else
              </label>
            ) : null}
          </div>
          {me && !bookingForOther ? (
            <p className="mt-1 text-xs text-slate-500">
              Prefilled from your account. Edit anything that&apos;s out of date —
              changes save when you continue to payment.
            </p>
          ) : null}
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field
              name="fullName"
              label={bookingForOther ? "Patient name" : "Full name"}
              required
              defaultValue={defaults.fullName}
              autoComplete={bookingForOther ? "off" : "name"}
            />
            <Field
              name="email"
              label="Email"
              type="email"
              required
              autoComplete="email"
              defaultValue={defaults.email}
            />
            <Field
              name="phone"
              label={bookingForOther ? "Patient phone (optional)" : "Phone (optional)"}
              type="tel"
              autoComplete={bookingForOther ? "off" : "tel"}
              defaultValue={defaults.phone}
            />
            <Field
              name="dateOfBirth"
              label={bookingForOther ? "Patient date of birth" : "Date of birth"}
              type="date"
              defaultValue={defaults.dateOfBirth}
              autoComplete={bookingForOther ? "off" : "bday"}
            />
          </div>

          {needsShipping ? (
            <>
              <h2 className="mt-8 text-lg font-bold text-slate-900">Shipping address</h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <Field name="shipName" label="Recipient name" required />
                <Field
                  name="shipCountryCode"
                  label="Country code (ISO)"
                  required
                  defaultValue={cart.countryCode.toUpperCase()}
                  maxLength={4}
                  uppercase
                />
                <Field name="shipLine1" label="Address line 1" required full />
                <Field name="shipLine2" label="Address line 2 (optional)" full />
                <Field name="shipCity" label="City" required />
                <Field name="shipPostalCode" label="Postal code" required />
              </div>
            </>
          ) : null}

          {error ? (
            <p className="mt-4 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={submitting}
            className="mt-6 inline-flex items-center justify-center gap-2 rounded-md bg-emerald-700 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-emerald-800 disabled:opacity-60"
          >
            {submitting ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : null}
            {submitting ? "Redirecting to Stripe…" : `Pay ${formatPrice(total, cart.currencyCode)}`}
          </button>
          <p className="mt-2 text-xs text-slate-500">
            You will be redirected to Stripe to complete payment.
          </p>
        </form>

        <aside className="self-start rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900">Order summary</h2>
          <ul className="mt-4 space-y-3 text-sm">
            {cart.items.map((i) => (
              <li key={i.id} className="flex justify-between gap-3">
                <span className="min-w-0 flex-1 text-slate-700">
                  {i.name}{" "}
                  <span className="text-slate-400">× {i.quantity}</span>
                </span>
                <span className="font-semibold text-slate-900">
                  {formatPrice(i.lineTotalCents, cart.currencyCode)}
                </span>
              </li>
            ))}
          </ul>
          <dl className="mt-4 space-y-2 border-t border-slate-100 pt-4 text-sm">
            <div className="flex justify-between">
              <dt className="text-slate-600">Subtotal</dt>
              <dd className="font-semibold text-slate-900">
                {formatPrice(cart.subtotalCents, cart.currencyCode)}
              </dd>
            </div>
            {shippingCents > 0 ? (
              <div className="flex justify-between">
                <dt className="text-slate-600">Shipping</dt>
                <dd className="font-semibold text-slate-900">
                  {formatPrice(shippingCents, cart.currencyCode)}
                </dd>
              </div>
            ) : null}
            <div className="flex justify-between border-t border-slate-200 pt-3 text-base">
              <dt className="font-bold text-slate-900">Total</dt>
              <dd className="font-bold text-slate-900">
                {formatPrice(total, cart.currencyCode)}
              </dd>
            </div>
          </dl>
        </aside>
      </div>
    </main>
  );
}

function Field({
  name,
  label,
  type = "text",
  required,
  autoComplete,
  full,
  defaultValue,
  maxLength,
  uppercase,
}: {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  autoComplete?: string;
  full?: boolean;
  defaultValue?: string;
  maxLength?: number;
  uppercase?: boolean;
}) {
  return (
    <label className={`flex min-w-0 flex-col gap-1 ${full ? "sm:col-span-2" : ""}`}>
      <span className="text-xs font-semibold uppercase tracking-wider text-slate-600">
        {label} {required ? <span className="text-rose-500">*</span> : null}
      </span>
      <input
        type={type}
        name={name}
        required={required}
        autoComplete={autoComplete}
        defaultValue={defaultValue}
        maxLength={maxLength}
        className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
        style={uppercase ? { textTransform: "uppercase" } : undefined}
      />
    </label>
  );
}
