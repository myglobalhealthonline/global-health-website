"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Globe2, Upload, Trash2 } from "lucide-react";
import { RichTextHtmlField } from "@/app/(admin)/admin/_components/rich-text-html-field";
import { PhoneField } from "@/components/forms/phone-field";
import { dialCodeForCountry } from "@/lib/phone/dial-codes";
import {
  LanguagePicker,
  canonicalizeLanguages,
} from "@/components/forms/LanguagePicker";
import { PortalTabs } from "@/components/PortalTabs";
import { FormSection } from "@/components/FormSection";
import { PortalDialog } from "@/components/PortalDialog";
import { useUnsavedChanges } from "@/lib/hooks/use-unsaved-changes";
import type { ProfileStrings } from "./profile-sections";

/**
 * Doctor self-edit profile form. Split into two independent forms so that
 * bank-field validation can never block a public-profile save:
 *
 *  1. Profile form  — fullName, bio, qualifications, languages, whatsapp
 *  2. Payout form   — bankAccountHolder, bankBic, bankIban
 *
 * Each form sends only its own fields to PATCH /api/doctor/profile, so
 * a bad BIC in the payout section can't prevent a name change from saving.
 */

type Initial = {
  fullName: string;
  bio: string;
  defaultLocale: string;
  supportedLocales: Array<{ code: string; isDefault: boolean }>;
  translations: Array<{ locale: string; bio: string | null }>;
  qualifications: string[];
  languages: string[];
  whatsappNumber: string;
  profileImagePath: string | null;
  bankAccountHolder: string;
  bankBic: string;
  /** Masked IBAN ("•••• 1234") when one is on file, else null. */
  bankIbanMasked: string | null;
  bankIbanSet: boolean;
  /** Doctor's primary market country code — used to default the WhatsApp
   *  dial code (15-015) rather than always falling back to Ireland. */
  primaryCountryCode: string;
  markets: Array<{
    id: string;
    countryId: string;
    country: { id: string; code: string; name: string; slug: string; defaultLocale: string };
    supportedLocales: Array<{ code: string; isDefault: boolean }>;
    chamberEntity: string | null;
    registrationNumber: string | null;
    division: string | null;
    isVerified: boolean;
    verifiedAt: string | null;
    translations: Array<{ locale: string; bio: string | null }>;
    bank: {
      accountHolder: string | null;
      bic: string | null;
      ibanMasked: string | null;
      ibanSet: boolean;
    };
  }>;
};

type Msg = { kind: "success" | "error"; text: string };

function resolvePhotoSrc(path: string | null): string | null {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;
  if (path.startsWith("/api/media/")) {
    const base = process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, "") ?? "";
    return base ? `${base}${path}` : path;
  }
  return path;
}

function normalizeBioPayload(html: string): string | null {
  const trimmed = html.trim();
  if (!trimmed) return null;
  const root = document.createElement("div");
  root.innerHTML = trimmed;
  const text = (root.textContent ?? "").replace(/\u00a0/g, " ").trim();
  const hasMeaningfulMedia = root.querySelector("img") !== null;
  return text || hasMeaningfulMedia ? trimmed : null;
}

function MessageBanner({ msg }: { msg: Msg }) {
  return (
    <p
      role="status"
      aria-live="polite"
      className={`${
        msg.kind === "success" ? "gh-status-success" : "gh-status-warning"
      } mt-4 rounded-md border px-4 py-3 text-sm`}
    >
      {msg.text}
    </p>
  );
}

/** Country-matched IBAN/BIC examples (15-005) — a doctor editing their
 *  Czechia profile shouldn't see an Irish IBAN placeholder. Keyed by the
 *  app's country code; falls back to the Ireland example for markets not
 *  in this list yet. */
const IBAN_EXAMPLES: Record<string, { iban: string; bic: string }> = {
  ie: { iban: "IE29 AIBK 9311 5212 3456 78", bic: "AIBKIE2D" },
  cz: { iban: "CZ65 0800 0000 1920 0014 5399", bic: "GIBACZPX" },
  pt: { iban: "PT50 0002 0123 1234 5678 9015 4", bic: "BPIPPTPL" },
  es: { iban: "ES91 2100 0418 4502 0005 1332", bic: "CAIXESBB" },
  ro: { iban: "RO49 AAAA 1B31 0075 9384 0000", bic: "BTRLRO22" },
  gb: { iban: "GB29 NWBK 6016 1331 9268 19", bic: "NWBKGB2L" },
  br: { iban: "BR15 0000 0000 0000 1093 7840 9C2", bic: "BASABRSPXXX" },
  mt: { iban: "MT84 MALT 0110 0001 2345 MTLCAST001S", bic: "MALTMTMT" },
};

function ibanExample(countryCode: string | null | undefined) {
  return IBAN_EXAMPLES[(countryCode ?? "").toLowerCase()] ?? IBAN_EXAMPLES.ie;
}

function localeLabel(code: string, strings: ProfileStrings): string {
  const labels: Record<string, string> = {
    EN: strings.langEnglish,
    PT: strings.langPortuguese,
    ES: strings.langSpanish,
    CS: strings.langCzech,
    RO: strings.langRomanian,
    DE: strings.langGerman,
  };
  return labels[code.toUpperCase()] ?? code.toUpperCase();
}

/** BIC: 6 letters + 2 alphanumeric + optional 3 alphanumeric (8 or 11 chars). */
const BIC_RE = /^[A-Za-z]{6}[A-Za-z0-9]{2}([A-Za-z0-9]{3})?$/;

function bicError(raw: string, strings: ProfileStrings): string | null {
  const v = raw.trim().replace(/\s/g, "");
  if (!v) return null;
  return BIC_RE.test(v) ? null : strings.bicErrorMsg;
}

function ibanError(raw: string, strings: ProfileStrings): string | null {
  const v = raw.trim().replace(/\s/g, "");
  if (!v) return null;
  if (v.length < 15 || v.length > 34) return strings.ibanErrorLength;
  if (!/^[A-Za-z]{2}\d{2}[A-Za-z0-9]+$/.test(v))
    return strings.ibanErrorFormat;
  return null;
}

export function DoctorProfileEditForm({
  initial,
  activeCountryId,
  strings,
}: {
  initial: Initial;
  /** Country whose profile this page edits. Resolved from the route. */
  activeCountryId: string | null;
  strings: ProfileStrings;
}) {
  const router = useRouter();
  const initialQualificationsText = initial.qualifications.join("\n");
  const initialLanguagesKey = initial.languages.join("\u0000");
  // initialLanguagesKey is a content-stable proxy for initial.languages (whose
  // array identity churns every render) — deliberately excluded to avoid
  // recomputing on identity-only changes.
  const initialLanguages = useMemo(
    () => canonicalizeLanguages(initial.languages),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [initialLanguagesKey],
  );
  const marketOptions = initial.markets.length > 0 ? initial.markets : [];
  const activeMarket =
    marketOptions.find((market) => market.countryId === activeCountryId) ??
    marketOptions[0] ??
    null;
  const activeCountryName = activeMarket?.country.name ?? null;
  const activeMarketBank = activeMarket?.bank ?? null;
  const activeMarketHasIban = activeMarketBank?.ibanSet ?? initial.bankIbanSet;
  const activeMarketIbanMasked =
    activeMarketBank?.ibanMasked ?? initial.bankIbanMasked ?? "•••• ••••";
  const defaultLocale = (
    activeMarket?.country.defaultLocale ?? initial.defaultLocale
  ).toUpperCase();
  const supportedLocaleSource =
    activeMarket?.supportedLocales ?? initial.supportedLocales;
  const localeTabsKey = supportedLocaleSource
    .map((locale) => `${locale.code}:${locale.isDefault ? "1" : "0"}`)
    .join("|");
  const localeTabs = useMemo(() => {
    const seen = new Set<string>();
    const tabs = supportedLocaleSource
      .map((locale) => ({
        code: locale.code.toUpperCase(),
        isDefault: locale.isDefault || locale.code.toUpperCase() === defaultLocale,
      }))
      .filter((locale) => {
        if (seen.has(locale.code)) return false;
        seen.add(locale.code);
        return true;
      });
    if (!seen.has(defaultLocale)) {
      tabs.unshift({ code: defaultLocale, isDefault: true });
    }
    return tabs.length > 0 ? tabs : [{ code: "EN", isDefault: true }];
    // localeTabsKey is a content-stable proxy for supportedLocaleSource kept in
    // the deps to document intent even though it isn't read in the body.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultLocale, supportedLocaleSource, localeTabsKey]);

  /* ── Identity form (global — applies to all countries) ─ */
  const [identityPending, startIdentityTransition] = useTransition();
  const [identityMsg, setIdentityMsg] = useState<Msg | null>(null);

  /* ── Country listing form (bio + registration — this market only) ─ */
  const [countryListingPending, startCountryListingTransition] = useTransition();
  const [countryListingMsg, setCountryListingMsg] = useState<Msg | null>(null);
  const [activeBioLocale, setActiveBioLocale] = useState(
    localeTabs.find((locale) => locale.isDefault)?.code ?? localeTabs[0].code,
  );
  const [fullName, setFullName] = useState(initial.fullName);
  const [qualifications, setQualifications] = useState(initialQualificationsText);
  const [languages, setLanguages] = useState<string[]>(initialLanguages);
  const [whatsappNumber, setWhatsappNumber] = useState(initial.whatsappNumber);
  const [chamberEntity, setChamberEntity] = useState(
    activeMarket?.chamberEntity ?? "",
  );
  const [registrationNumber, setRegistrationNumber] = useState(
    activeMarket?.registrationNumber ?? "",
  );
  const [registrationDivision, setRegistrationDivision] = useState(
    activeMarket?.division ?? "",
  );

  // ponytail: snapshot-compare dirty tracking instead of a form-library
  // abstraction — this page's ~10 useState fields don't warrant one.
  // Bio (RichTextHtmlField) is uncontrolled/read-on-submit, so it's not
  // included in the snapshot; upgrade path if that needs coverage too.
  // useState (not useRef) so the dirty comparison below can read the
  // snapshot during render — reading ref.current at render time is a
  // react-hooks/refs violation since refs can change without a re-render.
  // Split into identity (global, PATCH /api/doctor/profile) vs country
  // listing (this market only, PATCH /api/doctor/profile/markets/[id])
  // snapshots so dirty state matches the two save scopes 1:1 (15-006).
  const [initialIdentitySnapshot, setInitialIdentitySnapshot] = useState(() =>
    JSON.stringify({
      fullName: initial.fullName,
      qualifications: initialQualificationsText,
      languages: initialLanguages,
      whatsappNumber: initial.whatsappNumber,
    }),
  );
  const isIdentityDirty =
    JSON.stringify({ fullName, qualifications, languages, whatsappNumber }) !==
    initialIdentitySnapshot;

  const [initialCountryListingSnapshot, setInitialCountryListingSnapshot] = useState(() =>
    JSON.stringify({
      chamberEntity: activeMarket?.chamberEntity ?? "",
      registrationNumber: activeMarket?.registrationNumber ?? "",
      registrationDivision: activeMarket?.division ?? "",
    }),
  );
  // Bio (RichTextHtmlField) tracked separately — it's uncontrolled/read-on-
  // submit, so its onChange callback (15-004) mirrors its sanitized HTML
  // into this map instead of the form-level snapshot above.
  const [bioByLocale, setBioByLocale] = useState<Record<string, string>>({});
  const [initialBioSnapshot, setInitialBioSnapshot] = useState<Record<string, string>>({});
  const isCountryListingDirty =
    JSON.stringify({ chamberEntity, registrationNumber, registrationDivision }) !==
      initialCountryListingSnapshot ||
    JSON.stringify(bioByLocale) !== JSON.stringify(initialBioSnapshot);

  /* ── Payout form ──────────────────────────────────── */
  const [payoutPending, startPayoutTransition] = useTransition();
  const [payoutMsg, setPayoutMsg] = useState<Msg | null>(null);
  const [bankAccountHolder, setBankAccountHolder] = useState(
    activeMarket?.bank.accountHolder ?? initial.bankAccountHolder,
  );
  const [bankBic, setBankBic] = useState(activeMarket?.bank.bic ?? initial.bankBic);
  const [bankIban, setBankIban] = useState("");
  const [bicFieldError, setBicFieldError] = useState<string | null>(null);
  const [ibanFieldError, setIbanFieldError] = useState<string | null>(null);

  const [initialPayoutSnapshot, setInitialPayoutSnapshot] = useState(() =>
    JSON.stringify({
      bankAccountHolder: activeMarket?.bank.accountHolder ?? initial.bankAccountHolder,
      bankBic: activeMarket?.bank.bic ?? initial.bankBic,
      bankIban: "",
    }),
  );
  const isPayoutDirty =
    JSON.stringify({ bankAccountHolder, bankBic, bankIban }) !==
    initialPayoutSnapshot;

  // Shared guard (15-003): covers hard nav (its own beforeunload listener)
  // AND in-app SPA link clicks via UnsavedChangesGuard mounted in the doctor
  // layout — a plain beforeunload effect here never fires on App Router
  // client-side navigation.
  useUnsavedChanges(isIdentityDirty || isCountryListingDirty || isPayoutDirty);

  /* ── Photo ────────────────────────────────────────── */
  const [photoPending, startPhotoTransition] = useTransition();
  const [photoPath, setPhotoPath] = useState<string | null>(
    initial.profileImagePath,
  );
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [removePhotoDialogOpen, setRemovePhotoDialogOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Resets all local edit state when a fresh `initial` snapshot arrives
    // (server refetch after save) — intentional sync, not derivable state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFullName(initial.fullName);
    setQualifications(initialQualificationsText);
    setLanguages(initialLanguages);
    setWhatsappNumber(initial.whatsappNumber);
    setChamberEntity(activeMarket?.chamberEntity ?? "");
    setRegistrationNumber(activeMarket?.registrationNumber ?? "");
    setRegistrationDivision(activeMarket?.division ?? "");
    setBankAccountHolder(activeMarket?.bank.accountHolder ?? initial.bankAccountHolder);
    setBankBic(activeMarket?.bank.bic ?? initial.bankBic);
    setBankIban("");
    setPhotoPath(initial.profileImagePath);
    setActiveBioLocale(
      localeTabs.find((locale) => locale.isDefault)?.code ?? localeTabs[0].code,
    );
    // Re-baseline dirty snapshots against the freshly synced values so a
    // successful save (which triggers router.refresh() -> new `initial`)
    // clears the dirty flag instead of comparing against stale state.
    setInitialIdentitySnapshot(
      JSON.stringify({
        fullName: initial.fullName,
        qualifications: initialQualificationsText,
        languages: initialLanguages,
        whatsappNumber: initial.whatsappNumber,
      }),
    );
    setInitialCountryListingSnapshot(
      JSON.stringify({
        chamberEntity: activeMarket?.chamberEntity ?? "",
        registrationNumber: activeMarket?.registrationNumber ?? "",
        registrationDivision: activeMarket?.division ?? "",
      }),
    );
    {
      const bioSnapshot: Record<string, string> = {};
      for (const locale of localeTabs) {
        bioSnapshot[locale.code] = initialBioForLocale(locale.code);
      }
      setBioByLocale(bioSnapshot);
      setInitialBioSnapshot(bioSnapshot);
    }
    setInitialPayoutSnapshot(
      JSON.stringify({
        bankAccountHolder: activeMarket?.bank.accountHolder ?? initial.bankAccountHolder,
        bankBic: activeMarket?.bank.bic ?? initial.bankBic,
        bankIban: "",
      }),
    );
  }, [
    initial.fullName,
    initialQualificationsText,
    initialLanguages,
    initialLanguagesKey,
    initial.whatsappNumber,
    initial.bankAccountHolder,
    initial.bankBic,
    initial.profileImagePath,
    activeMarket?.countryId,
    activeMarket?.chamberEntity,
    activeMarket?.registrationNumber,
    activeMarket?.division,
    activeMarket?.bank.accountHolder,
    activeMarket?.bank.bic,
    activeMarket?.translations,
    initial.translations,
    initial.bio,
    localeTabs,
    localeTabsKey,
  ]);

  function initialBioForLocale(locale: string): string {
    const normalized = locale.toUpperCase();
    const sourceTranslations = activeMarket?.translations ?? initial.translations;
    const translated = sourceTranslations.find(
      (entry) => entry.locale.toUpperCase() === normalized,
    );
    return translated?.bio ?? (normalized === defaultLocale ? initial.bio : "");
  }

  /* ── Photo handlers ──────────────────────────────── */
  function uploadPhoto(file: File) {
    setPhotoError(null);
    if (file.size > 5 * 1024 * 1024) {
      setPhotoError(strings.photoTooLarge);
      return;
    }
    startPhotoTransition(async () => {
      const fd = new FormData();
      fd.append("file", file);
      try {
        const res = await fetch("/api/doctor/profile/photo", {
          method: "POST",
          body: fd,
        });
        const json = (await res.json()) as {
          ok?: boolean;
          message?: string;
          data?: { path?: string };
        };
        if (!res.ok || !json.ok) {
          setPhotoError(json.message ?? strings.uploadFailed);
          return;
        }
        if (json.data?.path) setPhotoPath(json.data.path);
        router.refresh();
      } catch {
        setPhotoError(strings.networkError);
      }
    });
  }

  function confirmRemovePhoto() {
    setPhotoError(null);
    setRemovePhotoDialogOpen(false);
    startPhotoTransition(async () => {
      const res = await fetch("/api/doctor/profile/photo", {
        method: "DELETE",
      });
      const json = (await res.json()) as { ok?: boolean; message?: string };
      if (!res.ok || !json.ok) {
        setPhotoError(json.message ?? strings.removeFailed);
        return;
      }
      setPhotoPath(null);
      router.refresh();
    });
  }

  /* ── Identity submit (global — PATCH /api/doctor/profile) ──── */
  function onSubmitIdentity(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIdentityMsg(null);
    const payload = {
      fullName: fullName.trim(),
      qualifications: qualifications
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean),
      languages: languages.map((l) => l.trim()).filter(Boolean),
      whatsappNumber: whatsappNumber.trim() || null,
    };
    startIdentityTransition(async () => {
      try {
        const res = await fetch("/api/doctor/profile", {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload),
        });
        const json = (await res.json()) as { ok?: boolean; message?: string };
        if (!res.ok || !json.ok) {
          setIdentityMsg({
            kind: "error",
            text: json.message ?? strings.saveProfileFailed,
          });
          return;
        }
        setIdentityMsg({
          kind: "success",
          text: json.message ?? strings.profileUpdated,
        });
        router.refresh();
      } catch {
        setIdentityMsg({ kind: "error", text: strings.networkErrorRetry });
      }
    });
  }

  /* ── Country listing submit (this market only — PATCH markets/[id]) ── */
  function onSubmitCountryListing(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCountryListingMsg(null);
    if (!activeMarket) {
      setCountryListingMsg({ kind: "error", text: strings.noActiveCountry });
      return;
    }
    const formData = new FormData(event.currentTarget);
    const translations = localeTabs.map((locale) => {
      const bio = normalizeBioPayload(
        String(formData.get(`bio_${locale.code}`) ?? ""),
      );
      return { locale: locale.code, bio };
    });
    const marketPayload = {
      translations,
      chamberEntity: chamberEntity.trim() || null,
      registrationNumber: registrationNumber.trim() || null,
      division: registrationDivision.trim() || null,
    };
    startCountryListingTransition(async () => {
      try {
        const marketRes = await fetch(
          `/api/doctor/profile/markets/${encodeURIComponent(activeMarket.countryId)}`,
          {
            method: "PATCH",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(marketPayload),
          },
        );
        const marketJson = (await marketRes.json()) as {
          ok?: boolean;
          message?: string;
        };
        if (!marketRes.ok || !marketJson.ok) {
          setCountryListingMsg({
            kind: "error",
            text: marketJson.message ?? strings.saveCountryProfileFailed,
          });
          return;
        }
        setCountryListingMsg({
          kind: "success",
          text: strings.countryListingUpdated.replace(
            "{country}",
            activeCountryName ?? strings.defaultDoctorProfile,
          ),
        });
        router.refresh();
      } catch {
        setCountryListingMsg({ kind: "error", text: strings.networkErrorRetry });
      }
    });
  }

  /* ── Payout submit ───────────────────────────────── */
  function onSubmitPayout(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPayoutMsg(null);
    if (!activeMarket) {
      setPayoutMsg({ kind: "error", text: strings.noActiveCountry });
      return;
    }

    // Client-side validation before hitting the backend
    const bErr = bicError(bankBic, strings);
    const iErr = ibanError(bankIban, strings);
    setBicFieldError(bErr);
    setIbanFieldError(iErr);
    if (bErr || iErr) return;

    const payload: Record<string, string | null> = {
      bankAccountHolder: bankAccountHolder.trim() || null,
      bankBic: bankBic.trim() || null,
    };
    // Only send IBAN when the doctor typed a new one — blank = keep current
    if (bankIban.trim()) payload.bankIban = bankIban.trim();

    startPayoutTransition(async () => {
      try {
        const res = await fetch(
          `/api/doctor/profile/markets/${encodeURIComponent(activeMarket.countryId)}`,
          {
            method: "PATCH",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ bank: payload }),
          },
        );
        const json = (await res.json()) as { ok?: boolean; message?: string };
        if (!res.ok || !json.ok) {
          setPayoutMsg({
            kind: "error",
            text: json.message ?? strings.savePayoutFailed,
          });
          return;
        }
        setPayoutMsg({ kind: "success", text: strings.payoutSaved });
        setBankIban("");
        router.refresh();
      } catch {
        setPayoutMsg({ kind: "error", text: strings.networkErrorRetry });
      }
    });
  }

  /* ── Render ─────────────────────────────────────── */
  return (
    <div className="gh-doctor-detail-grid gh-doctor-profile-edit-layout grid gap-4">
      <div className="grid gap-4">
        {/* ── Identity form (global — applies to all countries) ── */}
        <form onSubmit={onSubmitIdentity}>
          <FormSection
            title={strings.identitySection}
            description={strings.identitySectionDesc}
            titleAs="h2"
          >
            <span className="gh-form-section__span-2 inline-flex w-fit items-center gap-1.5 rounded-full border border-[var(--portal-line)] bg-[var(--portal-well)] px-2.5 py-1 text-portal-thead font-semibold text-[var(--portal-muted)]">
              <Globe2 className="size-3.5 text-[var(--portal-primary)]" aria-hidden />
              {strings.appliesToAllCountries}
            </span>

            <label className="flex flex-col gap-2">
              <span className="gh-field-label">{strings.fullName}</span>
              <input
                className="gh-input min-w-0"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                maxLength={200}
                required
              />
            </label>

            <label className="gh-form-section__span-2 flex flex-col gap-2">
              <span className="gh-field-label">{strings.qualifications}</span>
              <textarea
                className="gh-input min-h-[8rem] min-w-0 resize-y"
                value={qualifications}
                onChange={(e) => setQualifications(e.target.value)}
                placeholder={strings.qualificationsPlaceholder}
              />
              <span className="text-xs text-[var(--portal-muted)]">
                {strings.qualificationsHint}
              </span>
            </label>

            <div className="gh-form-section__span-2 flex flex-col gap-2">
              <span className="gh-field-label">{strings.languagesLabel}</span>
              <LanguagePicker selected={languages} onChange={setLanguages} />
              <span className="text-xs text-[var(--portal-muted)]">
                {strings.languagesHint}
              </span>
            </div>

            <label className="flex flex-col gap-2">
              <span className="gh-field-label">{strings.whatsappNumber}</span>
              <PhoneField
                key={initial.whatsappNumber}
                defaultValue={initial.whatsappNumber}
                defaultDial={dialCodeForCountry(initial.primaryCountryCode)}
                onChange={setWhatsappNumber}
                className="flex min-w-0 gap-2"
              />
              <span className="text-xs text-[var(--portal-muted)]">
                {strings.whatsappHint}
              </span>
            </label>

            {identityMsg ? (
              <div className="gh-form-section__span-2">
                <MessageBanner msg={identityMsg} />
              </div>
            ) : null}

            <div className="gh-form-section__span-2 gh-doctor-form-actions flex justify-end">
              <button
                type="submit"
                disabled={identityPending}
                className="gh-btn gh-btn-primary"
              >
                {identityPending ? strings.saving : strings.saveIdentity}
              </button>
            </div>
          </FormSection>
        </form>

        {/* ── Country listing form (bio + registration — this market only) ── */}
        {activeMarket ? (
          <form onSubmit={onSubmitCountryListing}>
            <FormSection
              title={strings.countryListingSection.replace("{country}", activeMarket.country.name)}
              description={strings.countryListingSectionDesc.replace(
                "{country}",
                activeMarket.country.name,
              )}
              titleAs="h2"
            >
              <div className="gh-form-section__span-2 flex flex-col gap-3">
                <div>
                  <span className="gh-field-label">{strings.bioByLanguage}</span>
                  <p className="mt-1 text-xs text-[var(--portal-muted)]">
                    {strings.bioByLanguageHint}
                  </p>
                </div>
                <PortalTabs
                  ariaLabel="Bio languages"
                  value={activeBioLocale}
                  onChange={setActiveBioLocale}
                  items={localeTabs.map((locale) => ({
                    value: locale.code,
                    label: `${localeLabel(locale.code, strings)}${locale.isDefault ? strings.defaultSuffix : ""}`,
                  }))}
                />
                {localeTabs.map((locale) => (
                  <div
                    key={locale.code}
                    role="tabpanel"
                    hidden={locale.code !== activeBioLocale}
                  >
                    <RichTextHtmlField
                      name={`bio_${locale.code}`}
                      label={strings.bioLabel.replace("{language}", localeLabel(locale.code, strings))}
                      initialValue={initialBioForLocale(locale.code)}
                      helperText={
                        locale.isDefault
                          ? strings.bioHelperDefault
                          : strings.bioHelperNonDefault
                      }
                      onChange={(html) =>
                        setBioByLocale((prev) => ({ ...prev, [locale.code]: html }))
                      }
                    />
                  </div>
                ))}
              </div>

              <div className="gh-form-section__span-2 gh-doctor-registration-card rounded-md border border-[var(--portal-line)] bg-[var(--portal-well)] p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="gh-field-label">
                      {strings.registrationTitle.replace("{country}", activeMarket.country.name)}
                    </span>
                    <p className="mt-1 text-xs text-[var(--portal-muted)]">
                      {strings.registrationEditsHint}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-1 text-portal-thead font-semibold ${
                      activeMarket.isVerified
                        ? "gh-status-success border"
                        : "border border-[var(--portal-line)] bg-[var(--portal-bg)] text-[var(--portal-muted)]"
                    }`}
                  >
                    {activeMarket.isVerified ? strings.verified : strings.needsVerification}
                  </span>
                </div>
                <div className="gh-doctor-field-grid mt-3 grid gap-3 sm:grid-cols-3">
                  <label className="flex flex-col gap-2">
                    <span className="gh-field-label">{strings.registrationBody}</span>
                    <input
                      className="gh-input min-w-0"
                      value={chamberEntity}
                      onChange={(e) => setChamberEntity(e.target.value)}
                      maxLength={64}
                      placeholder={strings.registrationBodyPlaceholder}
                    />
                  </label>
                  <label className="flex flex-col gap-2">
                    <span className="gh-field-label">{strings.registrationNumber}</span>
                    <input
                      className="gh-input min-w-0"
                      value={registrationNumber}
                      onChange={(e) => setRegistrationNumber(e.target.value)}
                      maxLength={64}
                    />
                  </label>
                  <label className="flex flex-col gap-2">
                    <span className="gh-field-label">{strings.division}</span>
                    <input
                      className="gh-input min-w-0"
                      value={registrationDivision}
                      onChange={(e) => setRegistrationDivision(e.target.value)}
                      maxLength={120}
                      placeholder={strings.divisionPlaceholder}
                    />
                  </label>
                </div>
              </div>

              {countryListingMsg ? (
                <div className="gh-form-section__span-2">
                  <MessageBanner msg={countryListingMsg} />
                </div>
              ) : null}

              <div className="gh-form-section__span-2 gh-doctor-form-actions flex justify-end">
                <button
                  type="submit"
                  disabled={countryListingPending}
                  className="gh-btn gh-btn-primary"
                >
                  {countryListingPending
                    ? strings.saving
                    : strings.saveCountryListing.replace("{country}", activeMarket.country.name)}
                </button>
              </div>
            </FormSection>
          </form>
        ) : null}

        {/* ── Payout / bank details form ───────────── */}
        <form onSubmit={onSubmitPayout}>
          <FormSection
            title={strings.payoutDetailsSection}
            description={
              <>
                {activeCountryName
                  ? strings.payoutDescCountry.replace("{country}", activeCountryName)
                  : strings.payoutDesc}{" "}
                {strings.payoutPrivateNote}
              </>
            }
            titleAs="h2"
          >
            <label className="gh-form-section__span-2 flex flex-col gap-2">
              <span className="gh-field-label">{strings.accountHolderName}</span>
              <input
                className="gh-input min-w-0"
                value={bankAccountHolder}
                onChange={(e) => setBankAccountHolder(e.target.value)}
                maxLength={160}
                placeholder={strings.accountHolderPlaceholder}
              />
            </label>

            <label className="gh-form-section__span-2 flex flex-col gap-2">
              <span className="gh-field-label">{strings.ibanLabel}</span>
              <input
                className="gh-input min-w-0 font-mono"
                value={bankIban}
                onChange={(e) => {
                  setBankIban(e.target.value);
                  setIbanFieldError(null);
                }}
                maxLength={42}
                autoComplete="off"
                spellCheck={false}
                inputMode="text"
                placeholder={
                  activeMarketHasIban
                    ? strings.ibanOnFilePlaceholder.replace("{masked}", activeMarketIbanMasked)
                    : ibanExample(activeMarket?.country.code).iban
                }
              />
              {ibanFieldError ? (
                <span className="text-xs text-red-600">{ibanFieldError}</span>
              ) : (
                <span className="text-xs text-[var(--portal-muted)]">
                  {activeMarketHasIban
                    ? strings.ibanOnFileHint
                    : strings.ibanNewHint}
                </span>
              )}
            </label>

            <label className="flex flex-col gap-2">
              <span className="gh-field-label">{strings.bicLabel}</span>
              <input
                className="gh-input min-w-0 font-mono"
                value={bankBic}
                onChange={(e) => {
                  setBankBic(e.target.value);
                  setBicFieldError(null);
                }}
                maxLength={16}
                autoComplete="off"
                spellCheck={false}
                placeholder={ibanExample(activeMarket?.country.code).bic}
              />
              {bicFieldError ? (
                <span className="text-xs text-red-600">{bicFieldError}</span>
              ) : null}
            </label>

            {payoutMsg ? (
              <div className="gh-form-section__span-2">
                <MessageBanner msg={payoutMsg} />
              </div>
            ) : null}

            <div className="gh-form-section__span-2 gh-doctor-form-actions flex justify-end">
              <button
                type="submit"
                disabled={payoutPending}
                className="gh-btn gh-btn-primary"
              >
                {payoutPending ? strings.saving : strings.savePayoutDetails}
              </button>
            </div>
          </FormSection>
        </form>
      </div>

      {/* ── Sidebar: photo + admin-managed ───────── */}
      <aside className="gh-doctor-side-stack grid gap-4 self-start">
        <section className="gh-card gh-doctor-profile-photo-card p-6">
          <h2
            className="m-0 text-[var(--portal-text)]"
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 16,
              fontWeight: 800,
            }}
          >
            {strings.profilePhotoTitle}
          </h2>
          <p className="mt-1 text-portal-compact text-[var(--portal-muted)]">
            {strings.profilePhotoHint}
          </p>
          <div className="gh-doctor-profile-photo mt-3 flex flex-col items-center gap-3">
            <div
              className="flex h-32 w-32 items-center justify-center overflow-hidden rounded-full"
              style={{
                background: "var(--portal-well)",
                border: "1px solid var(--portal-line)",
              }}
            >
              {photoPath ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={resolvePhotoSrc(photoPath) ?? photoPath}
                  alt="Profile"
                  style={{ height: "100%", width: "100%", objectFit: "cover" }}
                />
              ) : (
                <span
                  className="text-[28px] font-bold"
                  style={{
                    color: "var(--portal-primary)",
                  }}
                >
                  {fullName
                    .trim()
                    .split(/\s+/)
                    .slice(0, 2)
                    .map((p) => p[0]?.toUpperCase() ?? "")
                    .join("") || "?"}
                </span>
              )}
            </div>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/avif"
              ref={fileInputRef}
              style={{ display: "none" }}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) uploadPhoto(f);
                e.target.value = "";
              }}
            />
            <div className="gh-doctor-profile-photo-actions flex w-full flex-col gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={photoPending}
                className="gh-btn gh-btn-primary w-full"
              >
                <Upload className="size-3.5" />
                {photoPending
                  ? strings.uploading
                  : photoPath
                    ? strings.replacePhoto
                    : strings.uploadPhoto}
              </button>
              {photoPath ? (
                <button
                  type="button"
                  onClick={() => setRemovePhotoDialogOpen(true)}
                  disabled={photoPending}
                  className="gh-btn gh-btn-soft w-full"
                >
                  <Trash2 className="size-3.5" /> {strings.removePhoto}
                </button>
              ) : null}
            </div>
            {photoError ? (
              <p className="gh-status-warning rounded-md border px-3 py-2 text-portal-label">
                {photoError}
              </p>
            ) : null}
          </div>
        </section>

        <section className="gh-card gh-doctor-admin-note-card p-6">
          <h2
            className="m-0 text-[var(--portal-text)]"
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 16,
              fontWeight: 800,
            }}
          >
            {strings.adminManagedTitle}
          </h2>
          <p className="mt-1 text-portal-compact text-[var(--portal-muted)]">
            {strings.adminManagedDesc}
          </p>
        </section>
      </aside>

      <PortalDialog
        open={removePhotoDialogOpen}
        onClose={() => setRemovePhotoDialogOpen(false)}
        title={strings.removePhotoConfirm}
        danger
        width="sm"
        footer={
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => setRemovePhotoDialogOpen(false)}
              disabled={photoPending}
              className="gh-btn gh-btn-soft"
            >
              {strings.cancel}
            </button>
            <button
              type="button"
              onClick={confirmRemovePhoto}
              disabled={photoPending}
              className="gh-btn gh-btn-primary"
            >
              {photoPending ? strings.uploading : strings.removePhoto}
            </button>
          </div>
        }
      >
        <p className="text-sm text-[var(--portal-muted)]">{strings.removePhotoBody}</p>
      </PortalDialog>
    </div>
  );
}

