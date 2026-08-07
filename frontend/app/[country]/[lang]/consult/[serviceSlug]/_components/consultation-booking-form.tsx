"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useParams, useRouter } from "next/navigation";
import { AlertCircle, Loader2 } from "lucide-react";
import Link from "next/link";
import { useCart } from "@/components/cart/CartContext";
import type { CartItemKind, BenefitSelection } from "@/lib/api/cart-types";
import {
  getBenefitOptions,
  setCartBenefit,
  type BenefitOption,
} from "@/lib/api/me-subscription";
import { fetchCurrentUser, type AuthUser } from "@/lib/api/auth-api";
import { listFamilyMembers, type FamilyMember } from "@/lib/api/family-client";
import { formatAppDate, formatAppTime } from "@/lib/format-datetime";
import { formatPriceRounded } from "@/lib/format-currency";
import { PhoneField } from "@/components/forms/phone-field";
import { DobField, isoToDisplayDob } from "@/components/forms/dob-field";
import { dialCodeForCountrySlug } from "@/lib/phone/dial-codes";
import type { CommonLocale } from "@/lib/i18n/types";
import type { InsuranceOption } from "@/lib/content/get-country-collections";
import {
  BRAZIL_STATES,
  bookingAddressCopy,
} from "@/lib/content/booking-address-copy";

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
  /** The slot confirmed on the time step (the URL's `?slot=`). On the details
   *  step it is fixed — shown as a summary, not re-picked here. */
  initialSlotId?: string | null;
  /** Link back to the time step (same /book URL without `?slot=`). */
  changeTimeHref: string;
  /**
   * Same-day GP quick-book mode. When set, the patient picked only a language +
   * time on the homepage; this form resolves the concrete GP doctor + slot at
   * submit time via POST /api/public/gp-assign (priority window + fair rotation,
   * decided server-side) and books that. `doctorId` is a placeholder in this
   * mode — the resolved one wins. Null/undefined = ordinary doctor-first flow.
   */
  autoAssign?: { country: string; language: string } | null;
  /**
   * Resolved ISO country code for the market being booked ("br", "pt", …).
   *
   * NOT derivable from the URL here: the `[country]` segment is a SLUG
   * ("brazil", "portugal"), and only the server has the slug→code registry
   * (`countryCodeFromSlug`) fully warmed, since admin-added countries are
   * registered per-request. So the page hands the code down instead.
   */
  countryCode: string;
  i18n: CommonLocale["bookingForm"];
  /** Which patient-intake fields this country's `BookingSetting` requires
   *  server-side — drives the required/optional label + attr so the form
   *  never claims a field is optional when the server will 400 without it. */
  bookingRequirements?: {
    requirePhone: boolean;
    requireDateOfBirth: boolean;
    requireNationalId: boolean;
    requireAddress: boolean;
    /** Show the PT-only Número de Utente field. Visibility only — the value
     *  is never required, so patients without an SNS number can still book. */
    collectUtenteNumber: boolean;
  };
  /** The insurer the patient chose back at the INSURANCE step (null = paying the
   *  standard price). The choice happens before time + doctor because only
   *  doctors in that insurer's network take its patients, so by the time we get
   *  here it's fixed — this form just collects the card number for it. */
  selectedInsurance?: InsuranceOption | null;
  /**
   * The `?benefit=` value the wizard's benefit step produced, as
   * `<source>:<refId>` or `none` (§11.2). Pre-selects the matching option here
   * so the details step shows the price the patient already agreed to.
   *
   * Absent on `/consult/[serviceSlug]`, which has no benefit step — that entry
   * point picks here instead, and this form is what writes the choice to the
   * cart either way. One write path, so the two cannot disagree.
   */
  benefitParam?: string | null;
};

/** Saved patient profile fields we prefill on the details step (req #2). */
type ProfileAddress = {
  addressLine1: string | null;
  addressLine2: string | null;
  addressCity: string | null;
  addressState: string | null;
  addressPostalCode: string | null;
  nationalIdNumber: string | null;
  utenteNumber: string | null;
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
  changeTimeHref,
  autoAssign,
  countryCode,
  i18n,
  bookingRequirements,
  selectedInsurance = null,
  benefitParam = null,
}: Props) {
  const requirePhone = bookingRequirements?.requirePhone ?? false;
  const requireDob = bookingRequirements?.requireDateOfBirth ?? false;
  const collectUtente = bookingRequirements?.collectUtenteNumber ?? false;
  const requireAddress = bookingRequirements?.requireAddress ?? false;
  const router = useRouter();
  const params = useParams<{ country: string; lang: string }>();
  // Brazil addresses differently from Portugal even in Portuguese (Endereço /
  // CEP / Estado vs Morada / Código postal), and the UF has no equivalent in
  // any other market — so the address labels come from a country-aware map,
  // and `addressCopy.state` being non-null is what renders the Estado field.
  //
  // Keyed on `countryCode`, NOT on `params.country`: the URL segment is the
  // slug ("brazil"), so matching it against "br" silently never fires.
  const addressCopy = useMemo(
    () => bookingAddressCopy(countryCode, params?.lang, i18n),
    [countryCode, params?.lang, i18n],
  );
  const { add } = useCart();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const errorRef = useRef<HTMLDivElement>(null);

  // Move focus to the error banner + scroll it into view whenever a
  // validation/submit error appears, so screen-reader users and keyboard
  // users notice it instead of the focus staying on a button that just
  // silently failed to submit.
  useEffect(() => {
    if (!error || !errorRef.current) return;
    errorRef.current.focus();
    errorRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [error]);

  // Clinic timezone drives all slot display so the patient sees the same
  // wall-clock the clinic + doctor use. Falls back to the app default when a
  // caller (e.g. the legacy book-online path) doesn't supply one.
  const tz = clinicTimezone ?? "Europe/Dublin";
  const tzLabel = tz.includes("/")
    ? tz.slice(tz.lastIndexOf("/") + 1).replace(/_/g, " ")
    : tz;

  const nationalIdLabel = idLabelForCountrySlug(params?.country);
  const privacyPolicyHref = `/${params?.country ?? ""}/${params?.lang ?? ""}/legal/privacy-policy`;
  const privacyPolicyLink = (
    <Link
      href={privacyPolicyHref}
      target="_blank"
      rel="noopener noreferrer"
      className="font-medium text-[var(--color-brand-primary)] underline underline-offset-2"
      onClick={(e) => e.stopPropagation()}
    >
      {i18n.privacyPolicyLinkLabel}
    </Link>
  );
  // Slot is fixed on the details step — chosen on the previous (time) step and
  // carried in the URL. Resolve it for the summary; never re-pick here. When
  // an `initialSlotId` was supplied but isn't in `slots` (someone else took
  // it, or it expired), `selectedSlot` must be null — NOT slots[0] — so the
  // patient is never silently booked into a time they didn't choose.
  const slotStale = Boolean(initialSlotId) && !slots.some((slot) => slot.id === initialSlotId);
  const selectedSlot = initialSlotId
    ? slots.find((slot) => slot.id === initialSlotId) ?? null
    : slots[0] ?? null;
  const selectedSlotId = selectedSlot?.id ?? null;

  // Auth + prefill state. We render the form unconditionally so guests
  // can still book — when signed in we fill the defaults from /api/auth/me.
  const [me, setMe] = useState<AuthUser | null>(null);
  const [authLoaded, setAuthLoaded] = useState(false);
  const [bookingForOther, setBookingForOther] = useState(false);
  const otherPatientSectionRef = useRef<HTMLDivElement>(null);
  // Approved dependents the logged-in patient can book for (Premium family
  // usage). Only those approved to use plan benefits (canUseCredits) appear.
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [selectedFamilyId, setSelectedFamilyId] = useState("");
  // Benefit selector (§6.3) — every source the patient can use for this
  // service, priced against the REAL slot, so the figure here is the figure
  // charged. The benefit step (when there was one) priced without a slot and
  // flagged percent options indicative; this is where that resolves.
  //
  // `null` selection means "pay the standard price" (cart source NONE).
  const [benefitOptions, setBenefitOptions] = useState<BenefitOption[]>([]);
  const [benefitChoice, setBenefitChoice] = useState<{ source: string; refId: string } | null>(null);
  // True once the wizard's `?benefit=` has been honoured, so the recommended
  // option does not overwrite a deliberate choice on a later re-fetch.
  const benefitPreselected = useRef(false);
  // Saved profile (address + national ID) so we don't ask for it again (req #2).
  const [profile, setProfile] = useState<ProfileAddress | null>(null);
  const [profileLoaded, setProfileLoaded] = useState(false);
  // Default ON (offer to save) until we learn the profile already has an
  // address; flipped in the profile fetch below.
  const [saveAddress, setSaveAddress] = useState(true);
  // Insurance: the company was chosen at the INSURANCE step (before time +
  // doctor, because the insurer decides which doctors exist). All this form does
  // is collect the card number. The server stays the price authority — it
  // re-validates coverage + the doctor's network membership and re-derives the
  // price.
  const [insurancePolicyNumber, setInsurancePolicyNumber] = useState("");
  // The insurance price only "reveals" once the patient has entered their card
  // number, mirroring the requirement that the price updates when they provide
  // their insurance details.
  const insuranceActive = Boolean(selectedInsurance && insurancePolicyNumber.trim());
  const displayedPriceCents = insuranceActive
    ? selectedInsurance!.insurancePriceCents
    : selectedSlot?.priceCents;

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
        // Pull the saved profile so the address + national ID prefill from the
        // account instead of being re-typed (req #2). Best-effort.
        try {
          const pr = await fetch("/api/account/profile", { credentials: "include" });
          if (!cancelled && pr.ok) {
            const json = (await pr.json()) as { data?: { profile?: Record<string, string | null> | null } };
            const p = json?.data?.profile ?? null;
            if (p) {
              setProfile({
                addressLine1: p.addressLine1 ?? null,
                addressLine2: p.addressLine2 ?? null,
                addressCity: p.addressCity ?? null,
                addressState: p.addressState ?? null,
                addressPostalCode: p.addressPostalCode ?? null,
                nationalIdNumber: p.nationalIdNumber ?? null,
                utenteNumber: p.utenteNumber ?? null,
              });
              // Already on file → nothing new to store, so default the save
              // checkbox off; otherwise leave it on to capture the new address.
              if (p.addressLine1) setSaveAddress(false);
            }
          }
        } catch {
          /* best-effort prefill — booking still works without it */
        }
      }
      if (!cancelled) {
        setProfileLoaded(true);
        setAuthLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Price every benefit source once we know the signed-in patient and the
  // chosen slot. With the slot, percent-based options are exact rather than
  // indicative — this is the price the patient confirms and the price checkout
  // re-derives.
  const slotPriceCents = selectedSlot?.priceCents;
  const meId = me?.id;
  useEffect(() => {
    if (!meId) return;
    let cancelled = false;
    void getBenefitOptions(serviceId, { doctorId, timeSlotId: selectedSlotId }).then((res) => {
      if (cancelled || !res.ok) return;
      const opts = res.data.options;
      setBenefitOptions(opts);
      if (benefitPreselected.current) return;
      benefitPreselected.current = true;
      // The wizard's choice wins; otherwise pre-select the cheapest (§13/§14).
      const [wizardSource, ...wizardRest] = (benefitParam ?? "").split(":");
      const wizardRef = wizardRest.join(":");
      const fromWizard =
        benefitParam === "none"
          ? null
          : opts.find(
              (o) =>
                o.source.toLowerCase() === wizardSource &&
                (!wizardRef || o.refId === wizardRef),
            );
      if (fromWizard) {
        setBenefitChoice({ source: fromWizard.source, refId: fromWizard.refId });
      } else if (benefitParam !== "none") {
        const best = opts.find((o) => o.recommended);
        if (best) setBenefitChoice({ source: best.source, refId: best.refId });
      }
    });
    return () => {
      cancelled = true;
    };
  }, [meId, serviceId, doctorId, selectedSlotId, benefitParam]);

  // Scroll the newly revealed "patient being treated" section into view so the
  // patient notices it appeared instead of scrolling past a section that grew
  // above the fold. Guarded by prefers-reduced-motion (UI-only, no logic change).
  useEffect(() => {
    if (!bookingForOther || !otherPatientSectionRef.current) return;
    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    otherPatientSectionRef.current.scrollIntoView({
      behavior: prefersReducedMotion ? "auto" : "smooth",
      block: "nearest",
    });
  }, [bookingForOther]);

  const approvedMembers = useMemo(
    () => familyMembers.filter((m) => m.canUseCredits),
    [familyMembers],
  );
  const selectedMember =
    approvedMembers.find((m) => m.id === selectedFamilyId) ?? null;
  // "Treating someone other than the account holder" — either the manual
  // free-text toggle OR an approved family member chosen from the dropdown.
  const treatingOther = bookingForOther || Boolean(selectedMember);

  const defaults = useMemo(
    () => ({
      fullName: me?.fullName ?? "",
      email: me?.email ?? "",
      phone: me?.phone ?? "",
      dateOfBirth: me?.dateOfBirth ? me.dateOfBirth.slice(0, 10) : "",
      nationalIdNumber: profile?.nationalIdNumber ?? "",
      utenteNumber: profile?.utenteNumber ?? "",
      addressLine1: profile?.addressLine1 ?? "",
      addressLine2: profile?.addressLine2 ?? "",
      addressCity: profile?.addressCity ?? "",
      addressState: profile?.addressState ?? "",
      addressPostalCode: profile?.addressPostalCode ?? "",
    }),
    [me, profile],
  );

  const maxDob = new Date().toISOString().slice(0, 10);
  const maxDobDisplay = isoToDisplayDob(maxDob);

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
    // Gated on the flag, not just on the field being absent, so a country that
    // doesn't collect it can never end up storing one.
    const utenteNumber = collectUtente
      ? String(form.get("utenteNumber") ?? "").trim()
      : "";
    const addressLine1 = String(form.get("addressLine1") ?? "").trim();
    const addressLine2 = String(form.get("addressLine2") ?? "").trim();
    const addressCity = String(form.get("addressCity") ?? "").trim();
    // Same gate as `utenteNumber`: read only where the market collects it, so
    // a non-BR booking can never carry a state.
    const addressState = addressCopy.state
      ? String(form.get("addressState") ?? "").trim()
      : "";
    const addressPostalCode = String(form.get("addressPostalCode") ?? "").trim();
    // The resolved code, NOT the URL segment's first two characters: the
    // segment is a slug, so slicing gave "po" for /portugal and "ir" for
    // /ireland. Only br/es/ro/cz sliced correctly, by coincidence.
    const addressCountryCode = countryCode.trim().toLowerCase();
    const consent = form.get("consent") === "on";
    // Combined GDPR checkbox: covers clinic/doctor sharing + platform
    // processing + cross-border access in one tick (was 3 separate boxes).
    const gdprCombinedConsent = form.get("gdprCombinedConsent") === "on";
    // GDPR: WhatsApp messaging consent must be an affirmative opt-in
    // (Art. 4(11) / Planet49) — unchecked box means NO consent.
    const whatsappConsent = form.get("whatsappOptIn") === "on";

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
    if (!gdprCombinedConsent) {
      setError(i18n.acceptCombinedConsent);
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

      // Same-day GP mode: resolve the concrete doctor + slot now. The backend
      // picks the GP (priority window + fair rotation); the patient never chose
      // one. A 409 means the slot was taken between the homepage and submit.
      let useDoctorId = doctorId;
      let useServiceId = serviceId;
      let useSlotId = selectedSlotId;
      if (autoAssign) {
        try {
          const ar = await fetch("/api/public/gp-assign", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              country: autoAssign.country,
              language: autoAssign.language,
              startAt: selectedSlot?.startAt,
            }),
          });
          const aj = (await ar.json()) as {
            ok?: boolean;
            data?: { doctorId?: string; serviceId?: string; timeSlotId?: string };
          };
          if (!ar.ok || !aj?.ok || !aj.data?.timeSlotId || !aj.data.doctorId) {
            setError(
              i18n.slotTakenError ?? "That time was just taken. Please go back and pick another time.",
            );
            return;
          }
          useDoctorId = aj.data.doctorId;
          useServiceId = aj.data.serviceId ?? serviceId;
          useSlotId = aj.data.timeSlotId;
        } catch {
          setError(i18n.reserveTimeError ?? "Could not reserve that time. Please go back and try again.");
          return;
        }
      }

      // Persist the cart-level benefit BEFORE adding the line (§25). Checkout
      // runs exactly one engine off this (§6.4), and a cart that reaches
      // checkout still UNSET with eligible sources is rejected — so this call
      // is what keeps a booking from that state, on both entry points.
      //
      // Guests get a 401 here and that is correct: they have no benefit to
      // record, their cart stays UNSET, and checkout resolves that to NONE
      // because nothing is eligible for them.
      if (me) {
        const cartBenefit: { source: "NONE" | "MEMBERSHIP" | "CORPORATE" | "PUBLIC_PLAN" | "INSURANCE"; refId?: string } =
          insuranceActive
            ? { source: "INSURANCE", refId: selectedInsurance!.companyId }
            : selectedMember
              ? // Booking for a dependent draws on the public plan's credit.
                { source: "PUBLIC_PLAN", refId: "credit" }
              : benefitChoice
                ? {
                    source: benefitChoice.source as "MEMBERSHIP" | "CORPORATE" | "PUBLIC_PLAN" | "INSURANCE",
                    refId: benefitChoice.refId,
                  }
                : { source: "NONE" };
        const saved = await setCartBenefit(cartBenefit);
        if (!saved.ok && saved.status !== 401) {
          setError(saved.message ?? i18n.addToCartError ?? "Could not add to cart");
          return;
        }
      }

      const res = await add({
        kind,
        serviceId: useServiceId,
        doctorId: useDoctorId,
        timeSlotId: useSlotId,
        // Premium family usage — the line targets an approved dependent and
        // pre-selects the credit benefit (server re-verifies eligibility). For a
        // SELF booking, carry the benefit chosen at this step (B6); the server
        // re-resolves it authoritatively at checkout.
        // Insurance replaces plan/family benefits (no stacking): when a company
        // is selected + its policy entered, skip the benefit fields entirely.
        ...(insuranceActive
          ? {
              insuranceCompanyId: selectedInsurance!.companyId,
              insurancePolicyNumber: insurancePolicyNumber.trim(),
            }
          : selectedMember
            ? { familyMemberId: selectedMember.id, benefitSelection: "USE_PLAN_CREDIT" as const }
            : !treatingOther && benefitChoice?.source === "PUBLIC_PLAN"
              ? {
                  // The cart-level source is PUBLIC_PLAN; WHICH plan benefit
                  // still rides on the line, in the column that already
                  // carries it (§6.3) — no new column needed.
                  benefitSelection: (benefitChoice.refId === "credit"
                    ? "USE_PLAN_CREDIT"
                    : "USE_PLAN_DISCOUNT") as BenefitSelection,
                }
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
          utenteNumber: utenteNumber || undefined,
          patientTimezone,
          addressLine1: addressLine1 || undefined,
          addressLine2: addressLine2 || undefined,
          addressCity: addressCity || undefined,
          addressState: addressState || undefined,
          addressPostalCode: addressPostalCode || undefined,
          addressCountryCode: addressCountryCode || undefined,
          // Combined checkbox above maps to all three backend consent
          // fields (payload names unchanged — backend validation requires
          // them). Medical access scope is no longer user-selectable; the
          // combined consent already covers network-wide access.
          gdprConsentClinic: true,
          gdprConsentPlatform: true,
          whatsappConsent,
          crossBorderConsentAccepted: true,
          medicalAccessConsentScope: "GLOBAL_NETWORK",
        },
      });
      if (!res.ok) {
        setError(res.message ?? i18n.addToCartError ?? "Could not add to cart");
        return;
      }
      // Persist national ID + (opted-in) address onto the logged-in patient's
      // PatientProfile in the background. Not awaited — the redirect to /cart
      // shouldn't wait on it; failure is non-fatal (editable later in profile).
      if (me && !treatingOther) {
        const profilePatch: Record<string, string> = {};
        if (nationalIdNumber) profilePatch.nationalIdNumber = nationalIdNumber;
        if (utenteNumber) profilePatch.utenteNumber = utenteNumber;
        if (saveAddress && addressLine1) {
          profilePatch.addressLine1 = addressLine1;
          if (addressLine2) profilePatch.addressLine2 = addressLine2;
          if (addressCity) profilePatch.addressCity = addressCity;
          if (addressState) profilePatch.addressState = addressState;
          if (addressPostalCode) profilePatch.addressPostalCode = addressPostalCode;
          if (addressCountryCode) profilePatch.addressCountryCode = addressCountryCode;
        }
        if (Object.keys(profilePatch).length > 0) {
          void fetch("/api/account/profile", {
            method: "PATCH",
            credentials: "include",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(profilePatch),
          }).catch(() => {});
        }
      }
      const country = params?.country ?? "";
      const lang = params?.lang ?? "";
      // `?added=1` is the cue for the cart page to flash a green
      // "Added to cart" banner so the patient sees positive feedback —
      // the cart icon badge alone isn't loud enough. `bDoctor`/`bWhen`/
      // `bPrice` name what was just booked so the flash confirms the actual
      // booking (not just "something was added") before the patient moves
      // on to checkout. ponytail: query string, not sessionStorage — the
      // details are short strings already in scope on this component.
      const flashParams = new URLSearchParams({ added: "1", bDoctor: doctorName });
      if (selectedSlot) {
        flashParams.set(
          "bWhen",
          `${formatAppDate(selectedSlot.startAt, tz)} · ${formatAppTime(selectedSlot.startAt, tz)} (${tzLabel})`,
        );
        if (typeof selectedSlot.priceCents === "number") {
          flashParams.set(
            "bPrice",
            formatPriceRounded(selectedSlot.priceCents, selectedSlot.currencyCode ?? "EUR"),
          );
        }
      }
      const dest =
        country && lang
          ? `/${country}/${lang}/cart?${flashParams.toString()}`
          : `/cart?${flashParams.toString()}`;
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
  const formKey = `${treatingOther ? "other" : "self"}:${selectedFamilyId || "none"}:${me?.id ?? (authLoaded ? "guest" : "loading")}:${profileLoaded ? "p" : "-"}`;

  return (
    <form
      key={formKey}
      onSubmit={onSubmit}
      className="mt-6 grid gap-6"
    >
      {/* Stale slot — the ?slot= the patient confirmed on the previous step
        * is no longer in the open `slots` list (someone else took it, or it
        * expired). Never fall through to the details form with a silently
        * substituted time: show a visible warning and send them back to
        * pick another time instead. */}
      {slotStale ? (
        <div
          role="alert"
          className="gh2-card-ivory flex flex-wrap items-center justify-between gap-3 border-l-4 p-4"
          style={{ borderLeftColor: "var(--color-status-warning-text)" }}
        >
          <p className="text-sm font-semibold text-[var(--color-text-primary)]">
            That time is no longer available — pick another.
          </p>
          <Link
            href={changeTimeHref}
            className="gh2-btn-lime justify-center"
          >
            {i18n.changeTime}
          </Link>
        </div>
      ) : null}

      {/* Selected time summary — the slot was confirmed on the previous
        * (time) step. This details step never re-picks it; "Change time"
        * returns to the time step (same URL without ?slot=). */}
      {selectedSlot ? (
        <div className="gh2-card-ivory flex flex-wrap items-center justify-between gap-3 p-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--color-text-muted)]">
              {i18n.selectedTime}
            </p>
            <p className="mt-1 text-sm font-semibold text-[var(--color-text-primary)]">
              {formatAppDate(selectedSlot.startAt, tz)} · {formatAppTime(selectedSlot.startAt, tz)} ({tzLabel})
              {typeof displayedPriceCents === "number"
                ? ` · ${formatPriceRounded(displayedPriceCents, selectedSlot.currencyCode ?? "EUR")}`
                : ""}
            </p>
            {insuranceActive ? (
              <p className="mt-1 text-xs font-semibold" style={{ color: "var(--color-brand-primary)" }}>
                Insurance price with {selectedInsurance!.name} applied
                {typeof selectedSlot.priceCents === "number" &&
                selectedSlot.priceCents !== displayedPriceCents
                  ? ` (was ${formatPriceRounded(selectedSlot.priceCents, selectedSlot.currencyCode ?? "EUR")})`
                  : ""}
              </p>
            ) : null}
          </div>
          <Link
            href={changeTimeHref}
            className="rounded-full border border-[var(--color-border)] px-4 py-2 text-sm font-semibold text-[var(--color-brand-primary)] transition-colors hover:bg-[var(--color-background-page)]"
          >
            {i18n.changeTime}
          </Link>
        </div>
      ) : null}

      {/* 2. Patient details — prefilled from account when signed in.
        * When bookingForOther, these fields remain the logged-in user's
        * contact/notification details. A separate sub-section collects
        * the actual patient (person being treated). */}
      <div role="group" className="gh2-card-ivory p-5 sm:p-6">
        <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--color-brand-primary)]">
          {treatingOther ? (i18n.yourContactDetails ?? "Your contact details") : i18n.patientDetails}
        </p>

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

        {/* Benefit selector (§6.3) — every source the patient can use for this
          * service, cheapest pre-selected, plus paying the standard price.
          *
          * Insurance is excluded from the list here: it was already fixed at
          * the benefit step (the insurer decides which doctors exist), and its
          * price only reveals once the card number is entered below (§33). */}
        {me && !treatingOther && !insuranceActive && benefitOptions.length > 0 ? (
          <div className="mt-3">
            <span className="text-xs font-semibold text-[var(--color-text-body)]">
              {i18n.benefitHeading}
            </span>
            <div role="radiogroup" aria-label={i18n.benefitHeading} className="mt-1.5 flex flex-wrap gap-1.5">
              {benefitOptions
                .filter((opt) => opt.source !== "INSURANCE")
                .map((opt) => {
                  const active =
                    benefitChoice?.source === opt.source && benefitChoice.refId === opt.refId;
                  return (
                    <button
                      key={`${opt.source}:${opt.refId}`}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      data-selected={active}
                      onClick={() => setBenefitChoice({ source: opt.source, refId: opt.refId })}
                      className="gh2-selectable rounded-full px-3 text-[12px] font-semibold"
                    >
                      {opt.label} —{" "}
                      {formatPriceRounded(opt.unitPriceCents, selectedSlot?.currencyCode ?? "EUR")}
                    </button>
                  );
                })}
              <button
                type="button"
                role="radio"
                aria-checked={benefitChoice === null}
                data-selected={benefitChoice === null}
                onClick={() => setBenefitChoice(null)}
                className="gh2-selectable rounded-full px-3 text-[12px] font-semibold"
              >
                {i18n.benefitPayNormal}
                {slotPriceCents != null
                  ? ` — ${formatPriceRounded(slotPriceCents, selectedSlot?.currencyCode ?? "EUR")}`
                  : ""}
              </button>
            </div>
            <BenefitScarcityNote
              option={benefitOptions.find(
                (o) => o.source === benefitChoice?.source && o.refId === benefitChoice?.refId,
              )}
              template={i18n.benefitScarcityNote}
            />
          </div>
        ) : null}

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {!treatingOther ? (
            <label className="block">
              <span className="gh-field-label text-xs font-semibold text-[var(--color-text-body)]" data-required>
                {i18n.patientFullName}
              </span>
              <input
                type="text"
                name="fullName"
                required
                aria-required="true"
                minLength={2}
                maxLength={120}
                defaultValue={defaults.fullName}
                className="mt-1 block w-full rounded-md border border-[var(--color-border)] bg-[var(--color-background-page)] px-3 py-2 text-sm text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-primary)]/40"
              />
            </label>
          ) : null}
          <label className={`block${treatingOther ? " sm:col-span-2" : ""}`}>
            <span className="gh-field-label text-xs font-semibold text-[var(--color-text-body)]" data-required>
              {treatingOther ? "Your email (for confirmation)" : i18n.email}
            </span>
            <input
              type="email"
              name="email"
              required
              aria-required="true"
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
              <span className="text-xs font-semibold text-[var(--color-text-body)]">
                {i18n.phone}
                {!requirePhone ? (
                  <span className="text-[11px] font-normal text-[var(--color-text-muted)]"> (optional)</span>
                ) : null}
              </span>
              <PhoneField
                name="phone"
                required={requirePhone}
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
                {!requireDob ? (
                  <span className="text-[11px] font-normal text-[var(--color-text-muted)]"> (optional)</span>
                ) : null}
              </span>
              <DobField
                name="dateOfBirth"
                required={requireDob}
                aria-required={requireDob}
                defaultValue={defaults.dateOfBirth}
                max={maxDob}
                className="mt-1 block w-full rounded-md border border-[var(--color-border)] bg-[var(--color-background-page)] px-3 py-2 text-sm text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-primary)]/40"
              />
              <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                Enter a date up to {maxDobDisplay}.
              </p>
            </label>
          ) : null}
        </div>

        {/* Patient being treated — shown only when booking for someone else.
          * Name is required; email + phone are optional (e.g. a child may
          * not have their own email or phone number). */}
        {bookingForOther ? (
          <div
            ref={otherPatientSectionRef}
            className="mt-5 rounded-[var(--radius-card)] border border-[var(--color-brand-primary)]/20 bg-[var(--color-background-soft)] p-4 scroll-mt-24"
          >
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--color-brand-primary)]">
              Patient being treated
            </p>
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              <label className="block sm:col-span-2">
                <span className="gh-field-label text-xs font-semibold text-[var(--color-text-body)]" data-required>
                  Patient full name
                </span>
                <input
                  type="text"
                  name="patientOtherName"
                  required
                  aria-required="true"
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
                  {!requirePhone ? (
                    <span className="text-[11px] font-normal text-[var(--color-text-muted)]">(optional)</span>
                  ) : null}
                </span>
                <PhoneField
                  name="patientOtherPhone"
                  required={requirePhone}
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
                  {!requireDob ? (
                    <span className="text-[11px] font-normal text-[var(--color-text-muted)]">(optional)</span>
                  ) : null}
                </span>
                <DobField
                  name="patientOtherDob"
                  required={requireDob}
                  aria-required={requireDob}
                  max={maxDob}
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
            defaultValue={defaults.nationalIdNumber}
            className="mt-1 block w-full rounded-md border border-[var(--color-border)] bg-[var(--color-background-page)] px-3 py-2 text-sm text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-primary)]/40"
          />
          <p className="mt-1 text-xs text-[var(--color-text-muted)]">
            {i18n.nationalIdHint}
          </p>
        </label>

        {/* Número de Utente — Portugal only, driven by the country's
          * BookingSetting.collectUtenteNumber. Optional by design: visitors and
          * expats treated in PT have no SNS number and must still be able to book. */}
        {collectUtente ? (
          <label className="mt-4 block">
            <span className="text-xs font-semibold text-[var(--color-text-body)]">
              {i18n.utenteOptional}
            </span>
            <input
              type="text"
              name="utenteNumber"
              inputMode="numeric"
              maxLength={64}
              autoComplete="off"
              defaultValue={defaults.utenteNumber}
              className="mt-1 block w-full rounded-md border border-[var(--color-border)] bg-[var(--color-background-page)] px-3 py-2 text-sm text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-primary)]/40"
            />
            <p className="mt-1 text-xs text-[var(--color-text-muted)]">
              {i18n.utenteHint}
            </p>
          </label>
        ) : null}

        {/* Insurance card number. The insurer itself was chosen at the earlier
          * INSURANCE step (it decides which doctors are bookable), so it's fixed
          * here — we only collect the card to verify. */}
        {selectedInsurance ? (
          <div className="mt-4 grid gap-3 rounded-md border border-[var(--color-border)] p-3">
            <p className="m-0 text-xs font-semibold text-[var(--color-text-body)]">
              Booking with {selectedInsurance.name} —{" "}
              {formatPriceRounded(
                selectedInsurance.insurancePriceCents,
                selectedSlot?.currencyCode ?? "EUR",
              )}
            </p>
            <label className="block">
              <span className="text-xs font-semibold text-[var(--color-text-body)]">
                Insurance card / policy number
              </span>
              <input
                type="text"
                value={insurancePolicyNumber}
                onChange={(e) => setInsurancePolicyNumber(e.target.value)}
                maxLength={120}
                autoComplete="off"
                placeholder={i18n.insurancePolicyPlaceholder}
                className="mt-1 block w-full rounded-md border border-[var(--color-border)] bg-[var(--color-background-page)] px-3 py-2 text-sm text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-primary)]/40"
              />
              <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                Your insurance price applies once you enter your card number. We&rsquo;ll reserve
                your time and verify your card before taking payment — you&rsquo;ll get a secure
                payment link by email &amp; WhatsApp once it&rsquo;s verified.
              </p>
            </label>
          </div>
        ) : null}

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
      </div>

      {/* 3. Patient address — required when the country's BookingSetting
        * has requireAddress on. Snapshotted onto the appointment so the
        * clinical record + any prescription dispatch has the address as
        * it stood at booking, even if the patient later edits their
        * profile. Country code is implicit from the URL slug. */}
      <div role="group" className="gh2-card-ivory p-5 sm:p-6">
        <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--color-brand-primary)]">
          {addressCopy.patientAddress}
        </p>
        <p className="mt-1 text-xs text-[var(--color-text-muted)]">
          {addressCopy.patientAddressNote}
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="block sm:col-span-2">
            <span className="gh-field-label text-xs font-semibold text-[var(--color-text-body)]" data-required={requireAddress || undefined}>
              {addressCopy.streetAddress}
            </span>
            <input
              type="text"
              name="addressLine1"
              required={requireAddress}
              aria-required={requireAddress}
              maxLength={120}
              autoComplete="address-line1"
              defaultValue={defaults.addressLine1}
              className="mt-1 block w-full rounded-md border border-[var(--color-border)] bg-[var(--color-background-page)] px-3 py-2 text-sm text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-primary)]/40"
            />
          </label>
          <label className="block sm:col-span-2">
            <span className="text-xs font-semibold text-[var(--color-text-body)]">
              {addressCopy.aptUnit}
            </span>
            <input
              type="text"
              name="addressLine2"
              maxLength={120}
              autoComplete="address-line2"
              defaultValue={defaults.addressLine2}
              className="mt-1 block w-full rounded-md border border-[var(--color-border)] bg-[var(--color-background-page)] px-3 py-2 text-sm text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-primary)]/40"
            />
          </label>
          <label className="block">
            <span className="gh-field-label text-xs font-semibold text-[var(--color-text-body)]" data-required={requireAddress || undefined}>{addressCopy.city}</span>
            <input
              type="text"
              name="addressCity"
              required={requireAddress}
              aria-required={requireAddress}
              maxLength={80}
              autoComplete="address-level2"
              defaultValue={defaults.addressCity}
              className="mt-1 block w-full rounded-md border border-[var(--color-border)] bg-[var(--color-background-page)] px-3 py-2 text-sm text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-primary)]/40"
            />
          </label>
          {/* Estado (UF) — Brazil only. A Brazilian address is ambiguous
            * without it, and no other market on the platform has an
            * equivalent, so the field appears only where the copy map
            * supplies a label. Required alongside the rest of the address. */}
          {addressCopy.state ? (
            <label className="block">
              <span className="gh-field-label text-xs font-semibold text-[var(--color-text-body)]" data-required={requireAddress || undefined}>
                {addressCopy.state}
              </span>
              <select
                name="addressState"
                required={requireAddress}
                aria-required={requireAddress}
                autoComplete="address-level1"
                defaultValue={defaults.addressState}
                className="mt-1 block w-full rounded-md border border-[var(--color-border)] bg-[var(--color-background-page)] px-3 py-2 text-sm text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-primary)]/40"
              >
                <option value="">{addressCopy.statePlaceholder}</option>
                {BRAZIL_STATES.map((uf) => (
                  <option key={uf} value={uf}>
                    {uf}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <label className="block">
            <span className="gh-field-label text-xs font-semibold text-[var(--color-text-body)]" data-required={requireAddress || undefined}>
              {addressCopy.postalCode}
            </span>
            <input
              type="text"
              name="addressPostalCode"
              required={requireAddress}
              aria-required={requireAddress}
              maxLength={20}
              autoComplete="postal-code"
              defaultValue={defaults.addressPostalCode}
              className="mt-1 block w-full rounded-md border border-[var(--color-border)] bg-[var(--color-background-page)] px-3 py-2 text-sm text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-primary)]/40"
            />
          </label>
        </div>

        {/* Save the entered address back to the profile (req #2). Shown only
          * to a signed-in patient booking for themselves. Defaults on when the
          * profile had no address, off when it was prefilled (already saved). */}
        {me && !treatingOther ? (
          <label className="mt-4 flex items-center gap-2 text-sm text-[var(--color-text-body)]">
            <input
              type="checkbox"
              checked={saveAddress}
              onChange={(e) => setSaveAddress(e.target.checked)}
              className="size-4 rounded border-[var(--color-border)]"
            />
            {i18n.saveAddressToProfile}
          </label>
        ) : null}
      </div>

      {/* 4. Consent — every required tick grouped in one place at the end of
        * the form (moved off the Patient Details card) so a patient scanning
        * top-to-bottom hits them all together instead of missing one buried
        * earlier. Clinic sharing + platform processing + cross-border access
        * were 3 separate required GDPR boxes; simplified to a single combined
        * checkbox per product request. It still maps to all three backend
        * consent fields on submit (see gdprConsentClinic/gdprConsentPlatform/
        * crossBorderConsentAccepted above) — only the UI collapsed. */}
      <div role="group" className="gh2-card-ivory p-5 sm:p-6">
        <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--color-brand-primary)]">
          {i18n.gdprConsent}
        </p>
        <label className="mt-2 flex items-start gap-2 text-xs text-[var(--color-text-muted)]">
          <input
            type="checkbox"
            name="consent"
            required
            aria-required="true"
            className="mt-0.5 size-4 rounded border-[var(--color-border)]"
          />
          <span>{i18n.consentStatement}</span>
        </label>
        <label className="mt-3 flex items-start gap-2 text-xs text-[var(--color-text-muted)]">
          <input
            type="checkbox"
            name="gdprCombinedConsent"
            required
            aria-required="true"
            className="mt-0.5 size-4 rounded border-[var(--color-border)]"
          />
          <span>
            {i18n.gdprCombinedConsent} {privacyPolicyLink}
          </span>
        </label>
        {/* WhatsApp updates OPT-IN (GDPR affirmative consent — pre-ticked /
          * opt-out boxes are invalid per Art. 4(11) + CJEU Planet49).
          * Unchecked = whatsappConsent=false, notifications skipped server-side. */}
        <label className="mt-3 flex items-start gap-2 text-xs text-[var(--color-text-muted)]">
          <input
            type="checkbox"
            name="whatsappOptIn"
            className="mt-0.5 size-4 rounded border-[var(--color-border)]"
          />
          <span>{i18n.whatsappConsent}</span>
        </label>
      </div>

      {error ? (
        <div
          ref={errorRef}
          role="alert"
          tabIndex={-1}
          className="gh-status-error flex items-start gap-2 rounded-[var(--radius-card)] px-4 py-3 text-sm font-semibold focus:outline-none"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>{error}</span>
        </div>
      ) : null}

      <button
        type="submit"
        disabled={pending || !authLoaded || !selectedSlotId}
        className="gh2-btn-lime w-full justify-center disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
        {pending ? i18n.addingToCart : i18n.continueToCart}
      </button>
    </form>
  );
}

/**
 * "Uses 1 of your N remaining" (§14) for the two scarce options — a membership
 * allowance unit and a plan credit. Both are countable and both are gone once
 * spent, which is exactly what a patient needs told BEFORE they spend one; a
 * percentage discount needs no such warning.
 */
function BenefitScarcityNote({
  option,
  template,
}: {
  option: BenefitOption | undefined;
  template: string;
}) {
  const note = option?.note;
  if (!note || (note.key !== "ALLOWANCE_UNIT" && note.key !== "PLAN_CREDIT")) return null;
  return (
    <p className="mt-1.5 text-xs text-[var(--color-text-muted)]">
      {template.replace("{count}", String(note.remaining))}
    </p>
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
