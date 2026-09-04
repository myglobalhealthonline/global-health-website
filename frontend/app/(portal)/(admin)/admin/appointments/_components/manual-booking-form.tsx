"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { AdminCard } from "../../_components/atoms";
import { formatAppDate, formatAppTime } from "@/lib/format-datetime";
import { bookingTimezoneForCountry } from "@/lib/booking-timezone";
import {
  NOTIFICATION_LOCALES,
  NOTIFICATION_LOCALE_LABEL,
  defaultNotificationLocaleForCountry,
  type NotificationLocale,
} from "@/lib/notification-locale";
import { formatPriceRounded } from "@/lib/format-currency";
import { CountryDialSelect } from "@/components/forms/country-dial-select";
import { splitPhone } from "@/lib/phone/dial-codes";
import { BRAZIL_STATES } from "@/lib/content/booking-address-copy";
import {
  combinePhone,
  hasErrors,
  validateManualBooking,
  type ManualBookingErrors,
} from "@/lib/admin/manual-booking-validation";

/** A bookable insurer for a service: only companies that cover it AND have at
 *  least one in-network doctor reach the form. `doctorIds` are that insurer's
 *  in-network doctors for the service. */
type InsuranceOption = {
  companyId: string;
  name: string;
  insurancePriceCents: number;
  doctorIds: string[];
};

type ServiceOption = {
  id: string;
  slug: string;
  name: string;
  basePriceCents: number | null;
  currencyCode: string | null;
  insuranceOptions: InsuranceOption[];
};

/** One priced benefit the patient already holds, from
 *  `/api/admin/membership-benefit-options` (§11.7). `refId` is the enrollment
 *  id for a MEMBERSHIP option — what the booking payload sends back. */
type MembershipBenefitOption = {
  source: "MEMBERSHIP" | "CORPORATE" | "PUBLIC_PLAN" | "INSURANCE";
  refId: string;
  label: string;
  unitPriceCents: number;
  discountCents: number;
  note: { key: string; remaining?: number } | null;
  indicative: boolean;
  recommended: boolean;
};

/** A level rule a SUPER_ADMIN may apply to a patient not entitled to it.
 *  Present in the response only for a SUPER_ADMIN session. */
type MembershipOverrideOption = {
  benefitId: string;
  planName: string;
  levelName: string;
  unitPriceCents: number;
  discountCents: number;
  basis: string;
  enrollmentId: string | null;
  patientHoldsPlan: boolean;
};

type DoctorOption = {
  id: string;
  slug: string;
  fullName: string;
  title: string | null;
  serviceIds: string[];
};

type ClinicOption = { id: string; name: string; city: string | null };

/** A distinct existing patient matching the typed email — returned by
 *  /api/admin/patients/by-email and offered in the email-field dropdown. */
type PatientOption = {
  email: string;
  fullName: string;
  dateOfBirth: string | null;
  phone: string | null;
  appointmentCount: number;
  lastBookedAt: string | null;
  nationalIdNumber: string | null;
  taxIdNumber: string | null;
  passportNumber: string | null;
  utenteNumber: string | null;
  addressLine1: string | null;
  addressCity: string | null;
  addressState: string | null;
  addressPostalCode: string | null;
  addressCountryCode: string | null;
  insuranceProviderName: string | null;
  insurancePolicyNumber: string | null;
};

type Slot = {
  id: string;
  startAt: string;
  endAt: string;
  priceCents?: number;
  pricingType?: "STANDARD" | "PEAK" | "OFF_PEAK";
  currencyCode?: string;
};

type Props = {
  countryCode: string;
  countryName: string;
  services: ServiceOption[];
  doctors: DoctorOption[];
  clinics: ClinicOption[];
  defaultDialCode: string;
  /** Show the Número de Utente field — driven by the booking country's
   *  `BookingSetting.collectUtenteNumber` (Portugal only). The value stays
   *  optional even when shown. */
  collectUtenteNumber: boolean;
  /** Server action that creates the booking. Runs only after the native
   *  submit proceeds — i.e. after client validation passes. */
  action: (formData: FormData) => void | Promise<void>;
  /** Prefill from the admin calendar "Book" deep link: once the admin picks a
   *  service this doctor covers, the doctor (and their clicked slot, if still
   *  open) are auto-selected. */
  initialDoctorId?: string;
  initialSlotId?: string;
};

/**
 * Admin manual-booking form (walk-in / phone-in). Client component so we can:
 *   - block submit + show per-field errors when anything required is missing
 *     or invalid (no incomplete booking ever reaches the server action),
 *   - filter doctors to the chosen service, then load that doctor's REAL open
 *     slots and force picking one (the appointment time is inventory, not
 *     free text),
 *   - capture the phone with a country-code picker (defaulted from the booking
 *     country, overridable) and submit it as "+<code> <number>".
 *
 * The server action re-validates everything — this is UX, not the only guard.
 */
export function ManualBookingForm({
  countryCode,
  countryName,
  services,
  doctors,
  clinics,
  defaultDialCode,
  collectUtenteNumber,
  action,
  initialDoctorId,
  initialSlotId,
}: Props) {
  // Brazil is the one market that addresses by UF + CEP rather than
  // city + postal code — same split the public BR booking form uses.
  const isBrazil = countryCode.trim().toLowerCase() === "br";
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [dialCode, setDialCode] = useState(defaultDialCode);
  const [phoneNational, setPhoneNational] = useState("");

  // Controlled so picking an existing patient can prefill them.
  const [nationalIdNumber, setNationalIdNumber] = useState("");
  const [taxIdNumber, setTaxIdNumber] = useState("");
  const [passportNumber, setPassportNumber] = useState("");
  const [utenteNumber, setUtenteNumber] = useState("");
  const [addressLine1, setAddressLine1] = useState("");
  const [addressCity, setAddressCity] = useState("");
  const [addressState, setAddressState] = useState("");
  const [addressPostalCode, setAddressPostalCode] = useState("");
  const [addressCountryCode, setAddressCountryCode] = useState("");

  // Existing-patient typeahead for the email field. Multiple distinct people
  // can share one account email, so the dropdown lets the admin pick the
  // right one and prefill name / DOB / phone instead of re-typing.
  const [patientOptions, setPatientOptions] = useState<PatientOption[]>([]);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [showPatientMenu, setShowPatientMenu] = useState(false);

  // Insurance card already on file for the selected existing patient. When
  // set, the service list narrows to services that card covers (the card is
  // already verified — no need to re-collect it), and the insurer is
  // pre-selected once a service is chosen. Admin can still opt back into the
  // full service list via `showAllServices`.
  const [cardOnFile, setCardOnFile] = useState<{ name: string; policyNumber: string } | null>(
    null,
  );
  const [showAllServices, setShowAllServices] = useState(false);

  const [serviceId, setServiceId] = useState("");
  const [doctorId, setDoctorId] = useState("");
  // Insurance choice for this booking ("" = standard price). Picked after the
  // service, because the insurer decides which doctors are bookable.
  const [insuranceCompanyId, setInsuranceCompanyId] = useState("");
  const [insurancePolicyNumber, setInsurancePolicyNumber] = useState("");
  // Admin discretionary discount, whole percent. Kept as a string so the field
  // can be empty (= no discount) rather than forcing a 0.
  const [discountPercent, setDiscountPercent] = useState("");
  // Coupon code. Mutually exclusive with the discount above — a valid coupon
  // greys that input out, mirroring the server's own refusal to accept both.
  const [couponCode, setCouponCode] = useState("");
  const [couponState, setCouponState] = useState<
    | { status: "idle" }
    | { status: "checking" }
    | { status: "valid"; code: string; discountPercent: number; scopeLabel: string }
    | { status: "invalid"; message: string }
  >({ status: "idle" });
  // Private membership (§11.7). One control for both cases: the value is
  // "membership:<enrollmentId>" for the patient's own benefit and
  // "override:<benefitId>" for the SUPER_ADMIN goodwill grant, so the two can
  // never both be set — which is exactly what the backend rejects.
  const [benefitChoice, setBenefitChoice] = useState("");
  const [overrideReason, setOverrideReason] = useState("");
  const [benefitOptions, setBenefitOptions] = useState<MembershipBenefitOption[]>([]);
  const [overrideOptions, setOverrideOptions] = useState<MembershipOverrideOption[] | null>(
    null,
  );
  const [benefitLoading, setBenefitLoading] = useState(false);
  const [benefitLoadError, setBenefitLoadError] = useState<string | null>(null);
  // Pre-selected from the country being booked in — the common case is a
  // patient who reads that country's language. The admin overrides it for the
  // expat/tourist case, which is exactly why this is a control and not a
  // derived value.
  const [notificationLocale, setNotificationLocale] = useState<NotificationLocale>(() =>
    defaultNotificationLocaleForCountry(countryCode),
  );
  const [consultationMode, setConsultationMode] = useState<"ONLINE" | "IN_PERSON">(
    "ONLINE",
  );
  const [clinicId, setClinicId] = useState("");
  const [locationAddress, setLocationAddress] = useState("");

  const [slots, setSlots] = useState<Slot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotsError, setSlotsError] = useState<string | null>(null);
  // Seeded from the booking country, not Europe/Dublin: the slot list renders
  // before the availability response lands, and a wrong seed showed every
  // country's slots in Irish time until it arrived.
  const [clinicTimezone, setClinicTimezone] = useState<string>(() =>
    bookingTimezoneForCountry(countryCode),
  );
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  // Which calendar month the admin is browsing for slots — 0 = this month, 1 =
  // next month, etc. Drives both the `days` fetched (far enough to reach the
  // end of that month) and which of the fetched days are actually shown.
  const [monthOffset, setMonthOffset] = useState(0);
  // Furthest month the admin can browse to — matches the backend's 120-day
  // pregeneration/availability horizon (doctor-availability.service.ts).
  const MONTH_OPTIONS = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 4 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      return {
        offset: i,
        year: d.getFullYear(),
        month: d.getMonth(),
        label: d.toLocaleDateString("en-GB", { month: "long", year: "numeric" }),
      };
    });
  }, []);
  const [selectedSlotId, setSelectedSlotId] = useState<string>("");

  const [errors, setErrors] = useState<ManualBookingErrors>({});
  const summaryRef = useRef<HTMLDivElement | null>(null);
  // Slot clicked on the admin calendar — consumed on the first availability
  // load that still contains it (it may have been booked in the meantime).
  const pendingSlotRef = useRef<string | null>(initialSlotId ?? null);

  // Services this patient's insurance card covers (matched by insurer name —
  // insurance companies are per-country, so name is the stable join key here).
  const cardServices = useMemo(() => {
    if (!cardOnFile) return services;
    return services.filter((s) =>
      s.insuranceOptions.some(
        (o) => o.name.trim().toLowerCase() === cardOnFile.name.trim().toLowerCase(),
      ),
    );
  }, [services, cardOnFile]);
  const visibleServices = cardOnFile && !showAllServices ? cardServices : services;

  // If the filtered list no longer contains the selected service (e.g. the
  // admin toggled "show all" off), drop the stale selection.
  useEffect(() => {
    if (serviceId && !visibleServices.some((s) => s.id === serviceId)) {
      setServiceId("");
      setInsuranceCompanyId("");
      setDoctorId("");
      setSelectedSlotId("");
      setSelectedDay(null);
      setSlots([]);
    }
  }, [visibleServices, serviceId]);

  const selectedService = useMemo(
    () => services.find((s) => s.id === serviceId) ?? null,
    [services, serviceId],
  );
  const selectedDoctor = useMemo(
    () => doctors.find((d) => d.id === doctorId) ?? null,
    [doctors, doctorId],
  );

  // Insurers bookable for the chosen service (backend already dropped any with
  // no in-network doctor), and the one currently selected.
  const insuranceOptions = useMemo(
    () => selectedService?.insuranceOptions ?? [],
    [selectedService],
  );
  const selectedInsurance = useMemo(
    () => insuranceOptions.find((o) => o.companyId === insuranceCompanyId) ?? null,
    [insuranceOptions, insuranceCompanyId],
  );

  // Doctors bookable for the chosen service (mirrors the public consult
  // filter). Before a service is picked, show none — the admin picks the
  // service first. Under an insurer, narrow to that insurer's network: only
  // doctors with a payout set for it take its patients (the backend rejects
  // the rest anyway).
  const filteredDoctors = useMemo(() => {
    if (!serviceId) return [];
    const base = doctors.filter((d) => d.serviceIds.includes(serviceId));
    if (!selectedInsurance) return base;
    const network = new Set(selectedInsurance.doctorIds);
    return base.filter((d) => network.has(d.id));
  }, [doctors, serviceId, selectedInsurance]);

  // Reset cascades happen in the select handlers below (not effects) so we
  // don't trigger cascading setState-in-effect renders.
  function handleServiceChange(value: string) {
    setServiceId(value);
    // Insurers are per-service — the previous pick can't carry over, except
    // to re-apply the patient's own card if this service covers it.
    const cardMatch = cardOnFile
      ? services
          .find((s) => s.id === value)
          ?.insuranceOptions.find(
            (o) => o.name.trim().toLowerCase() === cardOnFile.name.trim().toLowerCase(),
          )
      : null;
    setInsuranceCompanyId(cardMatch?.companyId ?? "");
    setInsurancePolicyNumber(cardMatch ? cardOnFile!.policyNumber : "");
    setDoctorId((cur) => {
      if (cur && doctors.find((d) => d.id === cur)?.serviceIds.includes(value)) return cur;
      // Calendar deep link: auto-pick the clicked doctor once a service they
      // cover is chosen.
      if (
        initialDoctorId &&
        doctors.find((d) => d.id === initialDoctorId)?.serviceIds.includes(value)
      ) {
        return initialDoctorId;
      }
      return "";
    });
    setSelectedSlotId("");
    setSelectedDay(null);
    setSlots([]);
  }

  function handleInsuranceChange(value: string) {
    setInsuranceCompanyId(value);
    // Switching insurer changes the eligible doctor pool — drop a doctor who
    // isn't in the new insurer's network (and their slot with them).
    const next = insuranceOptions.find((o) => o.companyId === value) ?? null;
    setDoctorId((cur) => (!cur || !next || next.doctorIds.includes(cur) ? cur : ""));
    setSelectedSlotId("");
    setSelectedDay(null);
    setSlots([]);
  }

  function handleDoctorChange(value: string) {
    setDoctorId(value);
    setSelectedSlotId("");
    setSelectedDay(null);
    setSlots([]);
  }

  // Load the doctor's open slots for the chosen service. Reuses the public
  // same-origin availability endpoint (peak pricing already attached).
  useEffect(() => {
    if (!selectedService || !selectedDoctor) return;
    const controller = new AbortController();
    const target = MONTH_OPTIONS[monthOffset] ?? MONTH_OPTIONS[0]!;
    const monthEnd = new Date(target.year, target.month + 1, 0);
    const daysUntilMonthEnd = Math.max(
      1,
      Math.ceil((monthEnd.getTime() - Date.now()) / (24 * 60 * 60 * 1000)) + 1,
    );
    const url =
      `/api/public/booking-availability?country=${encodeURIComponent(countryCode)}` +
      `&service=${encodeURIComponent(selectedService.slug)}` +
      `&doctor=${encodeURIComponent(selectedDoctor.slug)}&days=${daysUntilMonthEnd}`;
    void (async () => {
      setSlotsLoading(true);
      setSlotsError(null);
      try {
        const res = await fetch(url, { signal: controller.signal });
        const json = (await res.json()) as {
          ok?: boolean;
          data?: { slots?: Slot[]; clinicTimezone?: string };
          message?: string;
        };
        if (controller.signal.aborted) return;
        if (!res.ok || !json.ok || !json.data) {
          setSlots([]);
          setSlotsError(json.message ?? "Could not load this doctor's availability.");
          return;
        }
        const list = json.data.slots ?? [];
        setSlots(list);
        const tzVal = json.data.clinicTimezone ?? bookingTimezoneForCountry(countryCode);
        setClinicTimezone(tzVal);
        const pending = pendingSlotRef.current
          ? list.find((s) => s.id === pendingSlotRef.current)
          : undefined;
        pendingSlotRef.current = null;
        if (pending) {
          setSelectedDay(formatAppDate(pending.startAt, tzVal));
          setSelectedSlotId(pending.id);
        } else {
          setSelectedDay(list.length ? formatAppDate(list[0]!.startAt, tzVal) : null);
        }
      } catch {
        if (controller.signal.aborted) return;
        setSlots([]);
        setSlotsError("Could not load this doctor's availability.");
      } finally {
        if (!controller.signal.aborted) setSlotsLoading(false);
      }
    })();
    return () => controller.abort();
  }, [selectedService, selectedDoctor, countryCode, monthOffset, MONTH_OPTIONS]);

  function handleMonthChange(offset: number) {
    setMonthOffset(offset);
    setSelectedSlotId("");
    setSelectedDay(null);
  }

  // Group slots by clinic-local day for the date-pills + time-grid picker.
  // Slots are fetched out to the end of the selected month, so filter down to
  // just that month's days (the fetch range can span earlier months too).
  const grouped = useMemo(() => {
    const target = MONTH_OPTIONS[monthOffset] ?? MONTH_OPTIONS[0]!;
    const map = new Map<string, Slot[]>();
    for (const s of slots) {
      const d = new Date(s.startAt);
      if (d.getFullYear() !== target.year || d.getMonth() !== target.month) continue;
      const day = formatAppDate(s.startAt, clinicTimezone);
      const list = map.get(day) ?? [];
      list.push(s);
      map.set(day, list);
    }
    return map;
  }, [slots, clinicTimezone, monthOffset, MONTH_OPTIONS]);

  // Debounced substring lookup of existing patients as the admin types the
  // email. Fires once there are at least 2 characters; aborts in-flight
  // requests so the last keystroke wins.
  useEffect(() => {
    const value = email.trim();
    const controller = new AbortController();
    const timer = setTimeout(() => {
      // Too short to search — clear any stale matches and skip the fetch.
      if (value.length < 2) {
        setPatientOptions([]);
        setLookupLoading(false);
        return;
      }
      void (async () => {
        setLookupLoading(true);
        try {
          const res = await fetch(
            `/api/admin/patients/by-email?email=${encodeURIComponent(value)}`,
            { signal: controller.signal },
          );
          const json = (await res.json()) as {
            ok?: boolean;
            data?: { patients?: PatientOption[] };
          };
          if (controller.signal.aborted) return;
          setPatientOptions(
            res.ok && json.ok && Array.isArray(json.data?.patients)
              ? json.data!.patients!
              : [],
          );
        } catch {
          if (!controller.signal.aborted) setPatientOptions([]);
        } finally {
          if (!controller.signal.aborted) setLookupLoading(false);
        }
      })();
    }, 300);
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [email]);

  // Prefill the patient identity fields from a chosen existing patient.
  function selectPatient(p: PatientOption) {
    setEmail(p.email);
    setFullName(p.fullName);
    setDateOfBirth(p.dateOfBirth ?? "");
    if (p.phone) {
      const parts = splitPhone(p.phone, defaultDialCode);
      setDialCode(parts.dial);
      setPhoneNational(parts.national);
    }
    setNationalIdNumber(p.nationalIdNumber ?? "");
    setTaxIdNumber(p.taxIdNumber ?? "");
    setPassportNumber(p.passportNumber ?? "");
    setUtenteNumber(p.utenteNumber ?? "");
    setAddressLine1(p.addressLine1 ?? "");
    setAddressCity(p.addressCity ?? "");
    setAddressState(p.addressState ?? "");
    setAddressPostalCode(p.addressPostalCode ?? "");
    setAddressCountryCode(p.addressCountryCode ?? "");
    setCardOnFile(
      p.insuranceProviderName && p.insurancePolicyNumber
        ? { name: p.insuranceProviderName, policyNumber: p.insurancePolicyNumber }
        : null,
    );
    setShowAllServices(false);
    // The service pick (if any) predates this card — force a reselect so
    // the filtered list and insurer auto-apply take effect.
    setServiceId("");
    setInsuranceCompanyId("");
    setInsurancePolicyNumber("");
    setDoctorId("");
    setShowPatientMenu(false);
  }

  const combinedPhone = combinePhone(dialCode, phoneNational);

  // ── Membership benefit options (§11.7) ───────────────────────────────────
  // Re-fetched whenever the patient, service, doctor or slot changes, because
  // every one of them moves the price: the options are quoted against the REAL
  // slot once there is one, so what the admin reads down the phone is what
  // checkout charges.
  useEffect(() => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail.includes("@") || !serviceId) {
      setBenefitOptions([]);
      setOverrideOptions(null);
      setBenefitLoadError(null);
      return;
    }
    const controller = new AbortController();
    const params = new URLSearchParams({ email: trimmedEmail, serviceId });
    if (doctorId) params.set("doctorId", doctorId);
    if (selectedSlotId) params.set("timeSlotId", selectedSlotId);

    setBenefitLoading(true);
    const timer = setTimeout(() => {
      fetch(`/api/admin/membership-benefit-options?${params.toString()}`, {
        signal: controller.signal,
      })
        .then(async (res) => {
          if (!res.ok) throw new Error(`Benefit lookup failed (${res.status})`);
          return res.json();
        })
        .then((body) => {
          const data = body?.data ?? {};
          // Membership only. Corporate and public-plan options come back from
          // the shared resolver, but a manual booking has no column to record
          // them on and the backend would refuse them — offering one here would
          // just be a 422 the admin cannot act on.
          setBenefitOptions(
            (data.options ?? []).filter(
              (option: MembershipBenefitOption) => option.source === "MEMBERSHIP",
            ),
          );
          // Absent entirely for anyone below SUPER_ADMIN, so the override
          // section never renders for them.
          setOverrideOptions(data.overrideOptions ?? null);
          setBenefitLoadError(null);
        })
        .catch((err: unknown) => {
          if (controller.signal.aborted) return;
          // Surfaced rather than swallowed: a silently empty picker looks
          // identical to "this patient has no benefits", and the admin would
          // charge full price without knowing the lookup failed.
          setBenefitOptions([]);
          setOverrideOptions(null);
          setBenefitLoadError(
            err instanceof Error ? err.message : "Could not load this patient's benefits",
          );
        })
        .finally(() => {
          if (!controller.signal.aborted) setBenefitLoading(false);
        });
    }, 250);

    return () => {
      controller.abort();
      clearTimeout(timer);
      setBenefitLoading(false);
    };
  }, [email, serviceId, doctorId, selectedSlotId]);

  const selectedBenefit = useMemo(() => {
    if (benefitChoice.startsWith("membership:")) {
      const id = benefitChoice.slice("membership:".length);
      return benefitOptions.find((option) => option.refId === id) ?? null;
    }
    return null;
  }, [benefitChoice, benefitOptions]);
  const selectedOverride = useMemo(() => {
    if (benefitChoice.startsWith("override:")) {
      const id = benefitChoice.slice("override:".length);
      return (overrideOptions ?? []).find((option) => option.benefitId === id) ?? null;
    }
    return null;
  }, [benefitChoice, overrideOptions]);
  const isOverride = selectedOverride != null;
  const overrideReasonError =
    isOverride && overrideReason.trim().length < 5
      ? "A goodwill override needs a written reason of at least 5 characters."
      : null;

  // Insurance and a membership are mutually exclusive (§11.7) — the backend
  // rejects the pair, so the form makes it unreachable rather than letting the
  // admin fill both and meet a 422 after the slot is picked.
  const benefitBlocksInsurance = selectedBenefit != null || isOverride;

  // Debounced staff-facing code check. The admin endpoint returns the REAL
  // reason (expired, reserved for another address, fully redeemed) because a
  // person on the phone needs to know which one it is. It is advisory:
  // `createManualBooking` re-resolves the code with the booking's real
  // insurance / membership answers, and that is the decision that counts.
  useEffect(() => {
    const value = couponCode.trim().toUpperCase();
    if (!value) {
      setCouponState({ status: "idle" });
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(() => {
      void (async () => {
        setCouponState({ status: "checking" });
        try {
          const res = await fetch("/api/admin/coupons/validate", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              code: value,
              email: email.trim() || undefined,
              countryCode,
              // Lets the server judge a GP-only / specialist-only code against
              // the service being booked, instead of showing green here and
              // refusing on submit.
              serviceId: serviceId || undefined,
            }),
            signal: controller.signal,
          });
          const json = (await res.json()) as {
            ok?: boolean;
            message?: string;
            data?: {
              valid: boolean;
              message?: string;
              code?: string;
              discountPercent?: number;
              scopeLabel?: string;
            };
          };
          if (controller.signal.aborted) return;
          if (!res.ok || !json.ok || !json.data) {
            setCouponState({ status: "invalid", message: json.message ?? "Could not check that code." });
            return;
          }
          if (!json.data.valid) {
            setCouponState({ status: "invalid", message: json.data.message ?? "That code cannot be used." });
            return;
          }
          setCouponState({
            status: "valid",
            code: json.data.code!,
            discountPercent: json.data.discountPercent!,
            scopeLabel: json.data.scopeLabel ?? "",
          });
        } catch {
          if (!controller.signal.aborted) {
            setCouponState({ status: "invalid", message: "Could not check that code." });
          }
        }
      })();
    }, 400);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [couponCode, email, countryCode, serviceId]);

  const couponApplied = couponState.status === "valid";

  // ── Discount + live price preview ────────────────────────────────────────
  // The backend re-derives the price itself (base → peak → insurance) and
  // applies the discount to that; this preview mirrors the same order so the
  // admin can quote the patient a figure before submitting.
  const discountPct = useMemo(() => {
    const raw = discountPercent.trim();
    if (raw === "") return 0;
    const n = Number(raw);
    return Number.isFinite(n) ? n : Number.NaN;
  }, [discountPercent]);
  const discountError =
    Number.isNaN(discountPct) ||
    !Number.isInteger(discountPct) ||
    discountPct < 0 ||
    discountPct > 100
      ? "Discount must be a whole number between 0 and 100."
      : null;

  const selectedSlot = useMemo(
    () => slots.find((s) => s.id === selectedSlotId) ?? null,
    [slots, selectedSlotId],
  );
  // Insurance price beats the slot's peak price, which beats the service base —
  // the same precedence the server applies.
  // A chosen membership benefit replaces that resolved price, and the admin
  // discount then applies to the member price — the same order the server runs
  // (base → peak → insurance → membership → discount).
  const resolvedPriceCents =
    selectedInsurance?.insurancePriceCents ??
    selectedSlot?.priceCents ??
    selectedService?.basePriceCents ??
    null;
  const memberPriceCents = selectedOverride?.unitPriceCents ?? selectedBenefit?.unitPriceCents ?? null;
  const grossPriceCents = memberPriceCents ?? resolvedPriceCents;
  const priceCurrency =
    selectedService?.currencyCode ?? selectedSlot?.currencyCode ?? "EUR";
  // A coupon and the manual discount never both apply — the coupon wins in the
  // preview because the server refuses the pair outright and the input is
  // greyed while one is applied.
  const appliedPct = couponApplied ? couponState.discountPercent : discountPct;
  const netPriceCents =
    grossPriceCents == null || (!couponApplied && (discountError || discountPct <= 0))
      ? grossPriceCents
      : grossPriceCents - Math.round((grossPriceCents * appliedPct) / 100);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    const result = validateManualBooking({
      fullName,
      email,
      phone: combinedPhone,
      serviceId,
      doctorId,
      timeSlotId: selectedSlotId,
      consultationMode,
      clinicId: consultationMode === "IN_PERSON" ? clinicId : "",
      locationAddress: consultationMode === "IN_PERSON" ? locationAddress : "",
    });
    if (hasErrors(result) || discountError || overrideReasonError) {
      e.preventDefault(); // block — no booking, no account, no email
      setErrors(result);
      // Surface the summary so the admin sees what's missing.
      requestAnimationFrame(() =>
        summaryRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }),
      );
      return;
    }
    setErrors({});
    // Validation passed — let the native submit invoke the server action.
  }

  const errorList = [
    ...Object.values(errors),
    ...(discountError ? [discountError] : []),
    ...(overrideReasonError ? [overrideReasonError] : []),
  ];

  return (
    <form action={action} onSubmit={onSubmit} className="gh-admin-manual-booking-form" noValidate>
      <input type="hidden" name="countryCode" value={countryCode} />
      {/* Combined phone + the picked slot are derived from React state, so
        * the server action's FormData always carries the canonical values. */}
      <input type="hidden" name="phone" value={combinedPhone} />
      <input type="hidden" name="timeSlotId" value={selectedSlotId} />

      <AdminCard>
        <h2 className="text-[15px] font-bold text-[var(--color-text-primary)]">Patient</h2>
        <p className="mt-1 text-portal-meta text-[var(--color-text-muted)]">
          Existing accounts with this email are reused; otherwise a new patient User is created with a
          unique temporary password.
        </p>
        <div className="gh-admin-manual-booking-grid mt-4">
          <label className="flex flex-col gap-1.5">
            <span className="gh-field-label">Full name *</span>
            <input
              type="text"
              name="fullName"
              className="gh-input"
              maxLength={120}
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              aria-invalid={Boolean(errors.fullName)}
            />
            {errors.fullName ? <FieldError msg={errors.fullName} /> : null}
          </label>

          <label className="relative flex flex-col gap-1.5">
            <span className="gh-field-label">Email *</span>
            <input
              type="email"
              name="email"
              className="gh-input"
              maxLength={254}
              autoComplete="off"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setShowPatientMenu(true);
              }}
              onFocus={() => setShowPatientMenu(true)}
              // Delay so a click on a menu option registers before close.
              onBlur={() => setTimeout(() => setShowPatientMenu(false), 150)}
              aria-invalid={Boolean(errors.email)}
            />
            {errors.email ? <FieldError msg={errors.email} /> : null}
            {showPatientMenu && (lookupLoading || patientOptions.length > 0) ? (
              <div className="gh-admin-manual-patient-menu absolute left-0 right-0 top-[calc(100%+4px)] z-[var(--z-dropdown)] max-h-64 overflow-auto rounded-[var(--radius-card-sm)] border border-[var(--color-border)] bg-[var(--color-background-page)] shadow-lg">
                {lookupLoading ? (
                  <div className="flex items-center gap-2 px-3 py-2 text-portal-meta text-[var(--color-text-muted)]">
                    <Loader2 className="size-3.5 animate-spin" aria-hidden /> Searching existing
                    patients…
                  </div>
                ) : (
                  <>
                    <p className="border-b border-[var(--color-border)] px-3 py-1.5 text-portal-thead font-semibold uppercase tracking-[0.08em] text-[var(--color-text-muted)]">
                      {patientOptions.length} matching patient
                      {patientOptions.length === 1 ? "" : "s"} — pick one to prefill
                    </p>
                    {patientOptions.map((p, i) => (
                      <button
                        key={`${p.email}-${p.fullName}-${p.dateOfBirth ?? ""}-${i}`}
                        type="button"
                        // Keep input focus so onBlur doesn't close before click.
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => selectPatient(p)}
                        className="flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left hover:bg-[var(--color-brand-primary)]/10"
                      >
                        <span className="text-portal-compact font-semibold text-[var(--color-text-primary)]">
                          {p.fullName}
                        </span>
                        <span className="text-portal-meta text-[var(--color-text-muted)]">{p.email}</span>
                        <span className="text-portal-meta text-[var(--color-text-muted)]">
                          {[
                            p.dateOfBirth ? `DOB ${p.dateOfBirth}` : null,
                            p.phone,
                            p.appointmentCount > 0
                              ? `${p.appointmentCount} booking${p.appointmentCount === 1 ? "" : "s"}`
                              : "no bookings yet",
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        </span>
                      </button>
                    ))}
                  </>
                )}
              </div>
            ) : null}
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="gh-field-label">Phone *</span>
            <div className="flex gap-2">
              <CountryDialSelect
                className="gh-select max-w-[150px]"
                value={dialCode}
                onChange={setDialCode}
              />
              <input
                type="tel"
                inputMode="tel"
                className="gh-input flex-1"
                placeholder="871234567"
                maxLength={20}
                value={phoneNational}
                onChange={(e) => setPhoneNational(e.target.value)}
                aria-invalid={Boolean(errors.phone)}
              />
            </div>
            <span className="text-portal-meta text-[var(--color-text-muted)]">
              Saved as <span className="font-mono">{combinedPhone || `+${dialCode} …`}</span>
            </span>
            {errors.phone ? <FieldError msg={errors.phone} /> : null}
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="gh-field-label">Date of birth</span>
            <input
              type="date"
              name="dateOfBirth"
              className="gh-input"
              value={dateOfBirth}
              onChange={(e) => setDateOfBirth(e.target.value)}
            />
          </label>

          <Field
            label="National ID number"
            name="nationalIdNumber"
            maxLength={64}
            value={nationalIdNumber}
            onChange={setNationalIdNumber}
          />
          <Field
            label="Tax ID (NIF / PPS / CPF)"
            name="taxIdNumber"
            maxLength={64}
            value={taxIdNumber}
            onChange={setTaxIdNumber}
          />
          <Field
            label="Passport number"
            name="passportNumber"
            maxLength={64}
            value={passportNumber}
            onChange={setPassportNumber}
          />
          {/* Portugal only — the patient's SNS number, used by doctors to reach
            * national health records. Optional: many patients treated in PT
            * (visitors, expats) don't have one. */}
          {collectUtenteNumber ? (
            <Field
              label="Número de Utente (optional)"
              name="utenteNumber"
              maxLength={64}
              value={utenteNumber}
              onChange={setUtenteNumber}
            />
          ) : null}
          <Field
            label="Address line 1"
            name="addressLine1"
            maxLength={200}
            value={addressLine1}
            onChange={setAddressLine1}
          />
          <Field
            label="City"
            name="addressCity"
            maxLength={100}
            value={addressCity}
            onChange={setAddressCity}
          />
          {/* Estado (UF) — Brazil only, matching the public BR booking form.
            * Other markets have no equivalent, so the field stays hidden and
            * nothing is submitted for it. */}
          {isBrazil ? (
            <label className="flex flex-col gap-1.5">
              <span className="gh-field-label">Estado (UF)</span>
              <select
                name="addressState"
                className="gh-select"
                value={addressState}
                onChange={(e) => setAddressState(e.target.value)}
              >
                <option value="">— Select —</option>
                {BRAZIL_STATES.map((uf) => (
                  <option key={uf} value={uf}>
                    {uf}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <Field
            label={isBrazil ? "CEP" : "Postal code"}
            name="addressPostalCode"
            maxLength={32}
            value={addressPostalCode}
            onChange={setAddressPostalCode}
          />
          <Field
            label="Address country code"
            name="addressCountryCode"
            maxLength={8}
            placeholder="ie / pt / es…"
            value={addressCountryCode}
            onChange={setAddressCountryCode}
          />
        </div>
      </AdminCard>

      <AdminCard>
        <h2 className="text-[15px] font-bold text-[var(--color-text-primary)]">Appointment</h2>
        <div className="gh-admin-manual-booking-grid mt-4">
          <label className="flex flex-col gap-1.5">
            <span className="gh-field-label">Service *</span>
            <select
              name="serviceId"
              className="gh-select"
              value={serviceId}
              onChange={(e) => handleServiceChange(e.target.value)}
              aria-invalid={Boolean(errors.serviceId)}
            >
              <option value="" disabled>
                Select…
              </option>
              {visibleServices.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                  {s.basePriceCents != null && s.currencyCode
                    ? ` — ${(s.basePriceCents / 100).toFixed(2)} ${s.currencyCode}`
                    : ""}
                </option>
              ))}
            </select>
            {services.length === 0 ? (
              <span className="text-portal-meta text-[var(--color-text-muted)]">
                No active services for this country.
              </span>
            ) : cardOnFile ? (
              <span className="text-portal-meta text-[var(--color-text-muted)] flex items-center gap-2">
                {showAllServices
                  ? `Showing all services.`
                  : `Showing only services covered by the ${cardOnFile.name} card on file.`}
                <button
                  type="button"
                  className="underline"
                  onClick={() => setShowAllServices((v) => !v)}
                >
                  {showAllServices ? "Show covered only" : "Show all services"}
                </button>
              </span>
            ) : null}
            {errors.serviceId ? <FieldError msg={errors.serviceId} /> : null}
          </label>

          {/* Insurance — only for services with a bookable insurer in this
            * country. Picked before the doctor: an insurer's patients are only
            * seen by doctors who have a payout set for it. Booking here counts
            * as verified (the admin took the card details), so the patient gets
            * the payment link at the insurance price immediately. */}
          {insuranceOptions.length > 0 ? (
            <label className="flex flex-col gap-1.5">
              <span className="gh-field-label">Insurance</span>
              <select
                name="insuranceCompanyId"
                className="gh-select"
                value={insuranceCompanyId}
                onChange={(e) => handleInsuranceChange(e.target.value)}
              >
                <option value="">
                  Standard price
                  {selectedService?.basePriceCents != null && selectedService.currencyCode
                    ? ` — ${(selectedService.basePriceCents / 100).toFixed(2)} ${selectedService.currencyCode}`
                    : ""}
                </option>
                {insuranceOptions.map((o) => (
                  <option key={o.companyId} value={o.companyId}>
                    {o.name}
                    {selectedService?.currencyCode
                      ? ` — ${(o.insurancePriceCents / 100).toFixed(2)} ${selectedService.currencyCode}`
                      : ""}
                  </option>
                ))}
              </select>
              <span className="text-portal-meta text-[var(--color-text-muted)]">
                {selectedInsurance
                  ? cardOnFile && selectedInsurance.companyId === insuranceCompanyId
                    ? "Pre-filled from the card on file. Only doctors in this insurer's network are listed."
                    : "Charged at the insurance price. Only doctors in this insurer's network are listed."
                  : "Optional — pick an insurer to use its negotiated price."}
              </span>
            </label>
          ) : null}

          {selectedInsurance ? (
            <label className="flex flex-col gap-1.5">
              <span className="gh-field-label">Insurance card / policy number</span>
              <input
                type="text"
                name="insurancePolicyNumber"
                className="gh-input"
                maxLength={120}
                autoComplete="off"
                value={insurancePolicyNumber}
                onChange={(e) => setInsurancePolicyNumber(e.target.value)}
                placeholder="Card number from the patient"
              />
              <span className="text-portal-meta text-[var(--color-text-muted)]">
                Stored encrypted. Booking here records the card as verified by you.
              </span>
            </label>
          ) : null}

          {/* Private membership (§11.7). Rendered once there is a patient email
            * and a service; the prices firm up against the real slot as soon as
            * one is picked. Corporate and public-plan benefits are deliberately
            * absent — a manual booking has no column to record them on. */}
          {benefitLoadError ? (
            <p className="gh-status-warning rounded-[var(--radius-card-sm)] border px-4 py-3 text-portal-compact">
              {benefitLoadError}. The standard price applies until this loads.
            </p>
          ) : null}

          {benefitOptions.length > 0 || (overrideOptions?.length ?? 0) > 0 ? (
            <label className="flex flex-col gap-1.5">
              <span className="gh-field-label">Membership benefit</span>
              <select
                className="gh-select"
                value={benefitChoice}
                onChange={(e) => {
                  setBenefitChoice(e.target.value);
                  if (!e.target.value.startsWith("override:")) setOverrideReason("");
                  // Mutually exclusive with insurance — clear it rather than
                  // letting the pair reach the server and 422.
                  if (e.target.value) {
                    setInsuranceCompanyId("");
                    setInsurancePolicyNumber("");
                  }
                }}
                disabled={benefitLoading}
              >
                <option value="">
                  No membership benefit
                  {resolvedPriceCents != null
                    ? ` — ${(resolvedPriceCents / 100).toFixed(2)} ${priceCurrency}`
                    : ""}
                </option>
                {benefitOptions.map((option) => (
                  <option key={option.refId} value={`membership:${option.refId}`}>
                    {option.label} — {(option.unitPriceCents / 100).toFixed(2)} {priceCurrency}
                    {option.note?.key === "ALLOWANCE_UNIT"
                      ? ` (uses 1 of ${option.note.remaining})`
                      : ""}
                    {option.indicative ? " (indicative until a slot is picked)" : ""}
                  </option>
                ))}
                {(overrideOptions ?? []).map((option) => (
                  <option key={option.benefitId} value={`override:${option.benefitId}`}>
                    Override — {option.planName} · {option.levelName} —{" "}
                    {(option.unitPriceCents / 100).toFixed(2)} {priceCurrency}
                    {option.patientHoldsPlan ? " (patient is on this plan)" : ""}
                  </option>
                ))}
              </select>
              <span className="text-portal-meta text-[var(--color-text-muted)]">
                {benefitLoading
                  ? "Checking this patient's benefits…"
                  : isOverride
                    ? "Goodwill: this patient is not entitled to this benefit. No allowance unit is used, and the reason is recorded against the booking."
                    : selectedBenefit
                      ? "Charged at the member price. Insurance cannot be combined with a membership."
                      : "Optional — the patient's own benefits, priced for this slot."}
              </span>
            </label>
          ) : null}

          {isOverride ? (
            <label className="flex flex-col gap-1.5">
              <span className="gh-field-label">Override reason</span>
              <textarea
                className="gh-input"
                rows={2}
                maxLength={500}
                value={overrideReason}
                onChange={(e) => setOverrideReason(e.target.value)}
                placeholder="Why this patient is being given the member price"
                aria-invalid={Boolean(overrideReasonError)}
              />
              {overrideReasonError ? (
                <FieldError msg={overrideReasonError} />
              ) : (
                <span className="text-portal-meta text-[var(--color-text-muted)]">
                  Written to the audit log with your name. It is the only record of a
                  price given outside every configured rule.
                </span>
              )}
            </label>
          ) : null}

          {/* What the server actually reads. Kept as hidden inputs rather than
            * form-bound controls so the single select above cannot produce both
            * an enrollment and an override. */}
          <input
            type="hidden"
            name="membershipEnrollmentId"
            value={selectedBenefit?.refId ?? ""}
          />
          <input
            type="hidden"
            name="membershipOverrideBenefitId"
            value={selectedOverride?.benefitId ?? ""}
          />
          <input
            type="hidden"
            name="membershipOverrideReason"
            value={isOverride ? overrideReason : ""}
          />

          {/* Discretionary discount. Applied server-side to whatever price the
            * booking resolves to (base, peak, insurance, or the member price),
            * so the percentage always reads against what the patient would
            * otherwise pay. */}
          {/* Coupon code. Sits directly above the discount because the two are
            * alternatives, not additions: the server rejects a booking that
            * carries both, so a valid code greys the discount input out rather
            * than letting staff quote a compounded number nobody can see. */}
          <label className="flex flex-col gap-1.5">
            <span className="gh-field-label">Coupon code</span>
            <input
              type="text"
              name="couponCode"
              className="gh-input font-mono tracking-[0.08em] uppercase"
              autoComplete="off"
              spellCheck={false}
              placeholder="Optional"
              value={couponCode}
              onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
              aria-invalid={couponState.status === "invalid"}
            />
            {couponState.status === "checking" ? (
              <span className="text-portal-meta text-[var(--color-text-muted)]">
                Checking the code…
              </span>
            ) : couponState.status === "invalid" ? (
              <FieldError msg={couponState.message} />
            ) : couponState.status === "valid" ? (
              <span className="text-portal-meta text-[var(--color-text-body)]">
                {couponState.code} — {couponState.discountPercent}% off
                {couponState.scopeLabel && couponState.scopeLabel !== "Any booking"
                  ? ` (${couponState.scopeLabel.toLowerCase()})`
                  : ""}
                {grossPriceCents != null && netPriceCents != null
                  ? netPriceCents === 0
                    ? ". Comped in full — no payment link."
                    : `. Charges ${(netPriceCents / 100).toFixed(2)} ${priceCurrency} instead of ${(grossPriceCents / 100).toFixed(2)} ${priceCurrency}.`
                  : "."}
              </span>
            ) : (
              <span className="text-portal-meta text-[var(--color-text-muted)]">
                Optional. Not valid with insurance, a membership benefit, or in Brazil.
              </span>
            )}
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="gh-field-label">Discount %</span>
            <input
              type="number"
              name="discountPercent"
              className="gh-input"
              inputMode="numeric"
              min={0}
              max={100}
              step={1}
              placeholder="0"
              value={couponApplied ? "" : discountPercent}
              disabled={couponApplied}
              onChange={(e) => setDiscountPercent(e.target.value)}
              aria-invalid={Boolean(discountError)}
            />
            {couponApplied ? (
              <span className="text-portal-meta text-[var(--color-text-muted)]">
                Not available while a coupon is applied — clear the code above to
                use a manual discount instead.
              </span>
            ) : discountError ? (
              <FieldError msg={discountError} />
            ) : grossPriceCents != null && netPriceCents != null && discountPct > 0 ? (
              <span className="text-portal-meta text-[var(--color-text-body)]">
                {netPriceCents === 0 ? (
                  <>
                    Comped in full — the booking is created already paid, with no
                    payment link.
                  </>
                ) : (
                  <>
                    Charges {(netPriceCents / 100).toFixed(2)} {priceCurrency} instead of{" "}
                    {(grossPriceCents / 100).toFixed(2)} {priceCurrency}.
                  </>
                )}
              </span>
            ) : (
              <span className="text-portal-meta text-[var(--color-text-muted)]">
                Optional — leave blank to charge the full price.
                {grossPriceCents != null
                  ? ` Currently ${(grossPriceCents / 100).toFixed(2)} ${priceCurrency}.`
                  : ""}
              </span>
            )}
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="gh-field-label">Doctor *</span>
            <select
              name="doctorId"
              className="gh-select"
              value={doctorId}
              onChange={(e) => handleDoctorChange(e.target.value)}
              disabled={!serviceId}
              aria-invalid={Boolean(errors.doctorId)}
            >
              <option value="" disabled>
                {serviceId ? "Select…" : "Pick a service first"}
              </option>
              {filteredDoctors.map((d) => (
                <option key={d.id} value={d.id}>
                  {(d.title ? `${d.title} ` : "") + d.fullName}
                </option>
              ))}
            </select>
            <span className="text-portal-meta text-[var(--color-text-muted)]">
              {selectedInsurance
                ? `Only doctors in ${selectedInsurance.name}'s network for this service are listed.`
                : "Only doctors assigned to the selected service are listed."}
            </span>
            {serviceId && selectedInsurance && filteredDoctors.length === 0 ? (
              <span className="text-portal-meta text-[var(--color-status-warning-text,#b45309)]">
                No doctor takes {selectedInsurance.name} for this service. Set a payout for one on
                the insurance company, or book at the standard price.
              </span>
            ) : null}
            {errors.doctorId ? <FieldError msg={errors.doctorId} /> : null}
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="gh-field-label">Notification language *</span>
            <select
              name="notificationLocale"
              className="gh-select"
              value={notificationLocale}
              onChange={(e) => setNotificationLocale(e.target.value as NotificationLocale)}
            >
              {NOTIFICATION_LOCALES.map((code) => (
                <option key={code} value={code}>
                  {NOTIFICATION_LOCALE_LABEL[code]}
                </option>
              ))}
            </select>
            <span className="text-xs text-[var(--portal-muted)]">
              Emails and WhatsApp messages for this booking are written in this
              language. Defaults to the booking country&apos;s own language.
            </span>
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="gh-field-label">Consultation mode *</span>
            <select
              name="consultationMode"
              className="gh-select"
              value={consultationMode}
              onChange={(e) =>
                setConsultationMode(e.target.value as "ONLINE" | "IN_PERSON")
              }
            >
              <option value="ONLINE">Online (telemedicine)</option>
              <option value="IN_PERSON">In-person</option>
            </select>
          </label>

          {consultationMode === "IN_PERSON" ? (
            <>
              <label className="flex flex-col gap-1.5">
                <span className="gh-field-label">Clinic (in-person)</span>
                <select
                  name="clinicId"
                  className="gh-select"
                  value={clinicId}
                  onChange={(e) => setClinicId(e.target.value)}
                >
                  <option value="">— None —</option>
                  {clinics.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                      {c.city ? `, ${c.city}` : ""}
                    </option>
                  ))}
                </select>
                <span className="text-portal-meta text-[var(--color-text-muted)]">
                  Or use the free-text address. Provide one or the other, not both.
                </span>
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="gh-field-label">Location address (in-person, free text)</span>
                <input
                  type="text"
                  name="locationAddress"
                  className="gh-input"
                  maxLength={500}
                  value={locationAddress}
                  onChange={(e) => setLocationAddress(e.target.value)}
                />
              </label>
            </>
          ) : null}

          <label className="flex flex-col gap-1.5 sm:col-span-2">
            <span className="gh-field-label">Notes</span>
            <textarea name="notes" className="gh-input" rows={3} maxLength={2000} />
          </label>
        </div>

        {/* Every manual booking needs the patient's medical data for their
          * consultation notes — always true, shown checked for transparency
          * rather than left as a silent assumption. */}
        <label className="mt-4 flex items-start gap-2 text-portal-compact text-[var(--color-text-body)]">
          <input
            type="checkbox"
            checked
            disabled
            className="mt-0.5 size-4 rounded border-[var(--color-border)]"
          />
          <span>
            The patient has consented to their medical data being accessed and used for their
            consultation notes and medical records.
          </span>
        </label>

        {errors.venue ? (
          <div className="mt-3">
            <FieldError msg={errors.venue} />
          </div>
        ) : null}

        {/* Slot picker — date pills + time grid for the doctor's real open
          * inventory. */}
        <div className="gh-admin-manual-slot-section mt-6 border-t border-[var(--color-border)] pt-5">
          <div className="flex items-baseline justify-between gap-3">
            <span className="gh-field-label">Time slot *</span>
            {slots.length > 0 ? (
              <span className="text-portal-meta text-[var(--color-text-muted)]">
                {countryName} clinic time
              </span>
            ) : null}
          </div>

          {serviceId && doctorId ? (
            <div className="mt-2 flex items-center gap-2">
              <label htmlFor="manual-booking-month" className="gh-field-label !mb-0">
                Month
              </label>
              <select
                id="manual-booking-month"
                className="gh-input w-auto"
                value={monthOffset}
                onChange={(e) => handleMonthChange(Number(e.target.value))}
              >
                {MONTH_OPTIONS.map((m) => (
                  <option key={m.offset} value={m.offset}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          {!serviceId || !doctorId ? (
            <p className="mt-2 text-portal-compact text-[var(--color-text-muted)]">
              Choose a service and doctor to load open slots.
            </p>
          ) : slotsLoading ? (
            <p className="mt-2 inline-flex items-center gap-2 text-portal-compact text-[var(--color-text-muted)]">
              <Loader2 className="size-3.5 animate-spin" aria-hidden /> Loading availability…
            </p>
          ) : slotsError ? (
            <p className="gh-status-warning mt-2 rounded-[var(--radius-card-sm)] border px-3 py-2 text-portal-compact">
              {slotsError}
            </p>
          ) : slots.length === 0 ? (
            <p className="mt-2 text-portal-compact text-[var(--color-text-muted)]">
              No open slots for this doctor and service in{" "}
              {(MONTH_OPTIONS[monthOffset] ?? MONTH_OPTIONS[0])!.label}.
            </p>
          ) : (
            <SlotPicker
              grouped={grouped}
              tz={clinicTimezone}
              selectedDay={selectedDay}
              selectedSlotId={selectedSlotId}
              onSelectDay={(day, firstSlotId) => {
                setSelectedDay(day);
                setSelectedSlotId(firstSlotId);
              }}
              onSelectSlot={setSelectedSlotId}
              insurancePriceCents={selectedInsurance?.insurancePriceCents ?? null}
            />
          )}
          {errors.timeSlotId ? (
            <div className="mt-2">
              <FieldError msg={errors.timeSlotId} />
            </div>
          ) : null}
        </div>

        <p className="mt-4 text-portal-meta text-[var(--color-text-muted)]">
          The patient&apos;s email will include a Stripe payment link AND a set-password invite — they
          can set their own password or sign in immediately with a unique temporary password.
        </p>
      </AdminCard>

      {errorList.length > 0 ? (
        <div
          ref={summaryRef}
          role="alert"
          className="gh-status-warning rounded-[var(--radius-card-sm)] border px-4 py-3 text-sm"
        >
          <p className="font-semibold">Please fix the following before submitting:</p>
          <ul className="mt-1 list-disc pl-5">
            {errorList.map((msg) => (
              <li key={msg}>{msg}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="gh-admin-appointment-actions justify-end border-t border-[var(--color-border)] pt-6">
        <Link
          href="/admin/appointments"
          className="gh-btn gh-btn-ghost"
        >
          Cancel
        </Link>
        <SubmitButton />
      </div>
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="gh-btn gh-btn-primary" disabled={pending}>
      {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
      {pending ? "Creating…" : "Create booking & email patient"}
    </button>
  );
}

function SlotPicker({
  grouped,
  tz,
  selectedDay,
  selectedSlotId,
  onSelectDay,
  onSelectSlot,
  insurancePriceCents,
}: {
  grouped: Map<string, Slot[]>;
  tz: string;
  selectedDay: string | null;
  selectedSlotId: string;
  onSelectDay: (day: string, firstSlotId: string) => void;
  onSelectSlot: (slotId: string) => void;
  /** Under an insurer the negotiated flat price replaces the slot's peak price
   *  (the availability endpoint is insurance-unaware), so labels match what the
   *  patient is actually charged. */
  insurancePriceCents?: number | null;
}) {
  const daySlots = selectedDay ? grouped.get(selectedDay) ?? [] : [];
  return (
    <div className="gh-admin-slot-picker mt-3">
      <div className="gh-admin-slot-days -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {Array.from(grouped.entries()).map(([day, list]) => {
          const isActive = selectedDay === day;
          const date = list[0]?.startAt ? new Date(list[0]!.startAt) : null;
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
              aria-pressed={isActive}
              onClick={() => onSelectDay(day, list[0]?.id ?? "")}
              className={
                isActive
                  ? "gh-admin-slot-day gh-admin-slot-day--active flex shrink-0 flex-col items-center gap-0.5 rounded-2xl border-2 border-[var(--color-brand-primary)] bg-[var(--color-brand-primary)] px-4 py-2.5 text-white min-w-[64px]"
                  : "gh-admin-slot-day flex shrink-0 flex-col items-center gap-0.5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-background-page)] px-4 py-2.5 text-[var(--color-text-body)] min-w-[64px] hover:border-[var(--color-border-strong)]"
              }
            >
              <span className="text-portal-micro font-bold uppercase tracking-[0.12em] opacity-80">
                {weekday}
              </span>
              <span className="text-xl font-bold leading-none [font-variant-numeric:tabular-nums]">
                {dayNum}
              </span>
              <span className="text-portal-micro font-semibold uppercase tracking-[0.1em] opacity-70">
                {month}
              </span>
            </button>
          );
        })}
      </div>

      {selectedDay ? (
        <div className="gh-admin-slot-times mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {daySlots.map((s) => {
            const isSelected = selectedSlotId === s.id;
            return (
              <button
                key={s.id}
                type="button"
                aria-pressed={isSelected}
                onClick={() => onSelectSlot(s.id)}
                className={
                  isSelected
                    ? "gh-admin-slot-time gh-admin-slot-time--active inline-flex flex-col items-center justify-center rounded-xl border-2 border-[var(--color-brand-primary)] bg-[var(--color-brand-primary)] px-3 py-2 text-sm font-semibold text-white [font-variant-numeric:tabular-nums]"
                    : "gh-admin-slot-time inline-flex flex-col items-center justify-center rounded-xl border border-[var(--color-border)] bg-[var(--color-background-page)] px-3 py-2 text-sm font-semibold text-[var(--color-text-primary)] [font-variant-numeric:tabular-nums] hover:border-[var(--color-brand-primary)]"
                }
              >
                <span>{formatAppTime(s.startAt, tz)}</span>
                {typeof (insurancePriceCents ?? s.priceCents) === "number" ? (
                  <span
                    className={
                      isSelected
                        ? "mt-0.5 text-xs font-medium text-white/85"
                        : "mt-0.5 text-xs font-medium text-[var(--color-text-muted)]"
                    }
                  >
                    {formatPriceRounded(
                      (insurancePriceCents ?? s.priceCents) as number,
                      s.currencyCode ?? "EUR",
                    )}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

function FieldError({ msg }: { msg: string }) {
  return (
    <span className="text-portal-meta font-medium text-[var(--color-status-danger,#dc2626)]">{msg}</span>
  );
}

function Field({
  label,
  name,
  maxLength,
  placeholder,
  value,
  onChange,
}: {
  label: string;
  name: string;
  maxLength?: number;
  placeholder?: string;
  /** When provided the input is controlled (so it can be prefilled). */
  value?: string;
  onChange?: (value: string) => void;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="gh-field-label">{label}</span>
      <input
        type="text"
        name={name}
        className="gh-input"
        maxLength={maxLength}
        placeholder={placeholder}
        {...(value !== undefined
          ? { value, onChange: (e) => onChange?.(e.target.value) }
          : {})}
      />
    </label>
  );
}
