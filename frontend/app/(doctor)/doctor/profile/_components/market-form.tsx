"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Lock } from "lucide-react";
import { RichTextHtmlField } from "@/app/(admin)/admin/_components/rich-text-html-field";
import { PortalTabs } from "@/components/PortalTabs";
import { FormSection } from "@/components/FormSection";
import { Pill } from "@/components/portal-atoms";
import { useUnsavedChanges } from "@/lib/hooks/use-unsaved-changes";
import type { DoctorProfileChangeRequest } from "@/lib/api/doctor-api";
import {
  ApprovalNotice,
  MessageBanner,
  bicError,
  ibanError,
  ibanExample,
  isPending,
  localeLabel,
  normalizeBioPayload,
  requestFor,
  submitChangeRequests,
  type Msg,
} from "./form-helpers";
import type { ProfileStrings } from "./profile-sections";

type Market = {
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
};

/**
 * Body of `PATCH /api/doctor/profile/markets/:countryId`, mirroring the
 * backend's `doctorMarketPatchBodySchema`. That schema is `.strict()`, so a
 * key it doesn't know fails the whole request with "Invalid market profile
 * update" — these names must track
 * `backend/src/validations/doctor-market-profiles.schema.ts`. The listing
 * fields the schema also declares are admin-gated and rejected there, so only
 * `bank` is modelled here.
 *
 * Omitting a key leaves the stored value alone; sending `null` clears it.
 */
type MarketPayoutPatchBody = {
  bank: {
    accountHolder?: string | null;
    bic?: string | null;
    iban?: string | null;
  };
};

/**
 * One market's listing (bio + registration) and payout forms, plus its
 * status chips. Rendered once per active market inside a tab panel on the
 * combined `/doctor/profile` page — every market's instance stays mounted
 * (hidden via CSS by the tab panel) so dirty state survives tab switches.
 *
 * The listing half is admin-approved: submitting raises a
 * DoctorProfileChangeRequest per changed field (bio and registration are
 * reviewed separately) and the public listing is untouched until an admin
 * signs it off. Payout details stay doctor-owned and save immediately.
 */
export function DoctorMarketForm({
  market,
  changeRequests,
  strings,
}: {
  market: Market;
  changeRequests: DoctorProfileChangeRequest[];
  strings: ProfileStrings;
}) {
  const router = useRouter();
  const bioRequest = requestFor(changeRequests, "bio", market.countryId);
  const registrationRequest = requestFor(changeRequests, "registration", market.countryId);
  const bioLocked = isPending(bioRequest);
  const registrationLocked = isPending(registrationRequest);
  const [withdrawing, startWithdrawTransition] = useTransition();
  const defaultLocale = market.country.defaultLocale.toUpperCase();
  const localeTabsKey = market.supportedLocales
    .map((locale) => `${locale.code}:${locale.isDefault ? "1" : "0"}`)
    .join("|");
  const localeTabs = useMemo(() => {
    const seen = new Set<string>();
    const tabs = market.supportedLocales
      .map((locale) => ({
        code: locale.code.toUpperCase(),
        isDefault: locale.isDefault || locale.code.toUpperCase() === defaultLocale,
      }))
      .filter((locale) => {
        if (seen.has(locale.code)) return false;
        seen.add(locale.code);
        return true;
      });
    if (!seen.has(defaultLocale)) tabs.unshift({ code: defaultLocale, isDefault: true });
    return tabs.length > 0 ? tabs : [{ code: "EN", isDefault: true }];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultLocale, localeTabsKey]);

  function initialBioForLocale(locale: string): string {
    const normalized = locale.toUpperCase();
    return market.translations.find((t) => t.locale.toUpperCase() === normalized)?.bio ?? "";
  }

  /* ── Country listing form ────────────────────────── */
  const [listingPending, startListingTransition] = useTransition();
  const [listingMsg, setListingMsg] = useState<Msg | null>(null);
  const [activeBioLocale, setActiveBioLocale] = useState(
    localeTabs.find((l) => l.isDefault)?.code ?? localeTabs[0].code,
  );
  const [chamberEntity, setChamberEntity] = useState(market.chamberEntity ?? "");
  const [registrationNumber, setRegistrationNumber] = useState(market.registrationNumber ?? "");
  const [registrationDivision, setRegistrationDivision] = useState(market.division ?? "");
  const [bioByLocale, setBioByLocale] = useState<Record<string, string>>(() => {
    const snap: Record<string, string> = {};
    for (const l of localeTabs) snap[l.code] = initialBioForLocale(l.code);
    return snap;
  });

  const [initialListingSnapshot, setInitialListingSnapshot] = useState(() =>
    JSON.stringify({
      chamberEntity: market.chamberEntity ?? "",
      registrationNumber: market.registrationNumber ?? "",
      registrationDivision: market.division ?? "",
    }),
  );
  const [initialBioSnapshot, setInitialBioSnapshot] = useState<Record<string, string>>(() => {
    const snap: Record<string, string> = {};
    for (const l of localeTabs) snap[l.code] = initialBioForLocale(l.code);
    return snap;
  });
  const isListingDirty =
    JSON.stringify({ chamberEntity, registrationNumber, registrationDivision }) !== initialListingSnapshot ||
    JSON.stringify(bioByLocale) !== JSON.stringify(initialBioSnapshot);

  /* ── Payout form ──────────────────────────────────── */
  const [payoutPending, startPayoutTransition] = useTransition();
  const [payoutMsg, setPayoutMsg] = useState<Msg | null>(null);
  const [bankAccountHolder, setBankAccountHolder] = useState(market.bank.accountHolder ?? "");
  const [bankBic, setBankBic] = useState(market.bank.bic ?? "");
  const [bankIban, setBankIban] = useState("");
  const [bicFieldError, setBicFieldError] = useState<string | null>(null);
  const [ibanFieldError, setIbanFieldError] = useState<string | null>(null);

  const [initialPayoutSnapshot, setInitialPayoutSnapshot] = useState(() =>
    JSON.stringify({ bankAccountHolder: market.bank.accountHolder ?? "", bankBic: market.bank.bic ?? "", bankIban: "" }),
  );
  const isPayoutDirty =
    JSON.stringify({ bankAccountHolder, bankBic, bankIban }) !== initialPayoutSnapshot;

  useUnsavedChanges(isListingDirty || isPayoutDirty);

  useEffect(() => {
    // Resets this market's local edit state when a fresh `market` snapshot
    // arrives (server refetch after save via router.refresh()).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setChamberEntity(market.chamberEntity ?? "");
    setRegistrationNumber(market.registrationNumber ?? "");
    setRegistrationDivision(market.division ?? "");
    setBankAccountHolder(market.bank.accountHolder ?? "");
    setBankBic(market.bank.bic ?? "");
    setBankIban("");
    setActiveBioLocale(localeTabs.find((l) => l.isDefault)?.code ?? localeTabs[0].code);
    const bioSnapshot: Record<string, string> = {};
    for (const l of localeTabs) bioSnapshot[l.code] = initialBioForLocale(l.code);
    setBioByLocale(bioSnapshot);
    setInitialBioSnapshot(bioSnapshot);
    setInitialListingSnapshot(
      JSON.stringify({
        chamberEntity: market.chamberEntity ?? "",
        registrationNumber: market.registrationNumber ?? "",
        registrationDivision: market.division ?? "",
      }),
    );
    setInitialPayoutSnapshot(
      JSON.stringify({ bankAccountHolder: market.bank.accountHolder ?? "", bankBic: market.bank.bic ?? "", bankIban: "" }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    market.chamberEntity,
    market.registrationNumber,
    market.division,
    market.translations,
    market.bank.accountHolder,
    market.bank.bic,
    localeTabs,
  ]);

  function withdraw(requestId: string) {
    startWithdrawTransition(async () => {
      try {
        const res = await fetch(`/api/doctor/profile/change-requests/${requestId}`, {
          method: "DELETE",
        });
        const json = (await res.json()) as { ok?: boolean; message?: string };
        if (!res.ok || !json.ok) {
          setListingMsg({ kind: "error", text: json.message ?? strings.withdrawFailed });
          return;
        }
        setListingMsg({ kind: "success", text: strings.changeWithdrawn });
        router.refresh();
      } catch {
        setListingMsg({ kind: "error", text: strings.networkErrorRetry });
      }
    });
  }

  function onSubmitListing(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setListingMsg(null);
    const formData = new FormData(event.currentTarget);
    const translations = localeTabs.map((locale) => ({
      locale: locale.code,
      bio: normalizeBioPayload(String(formData.get(`bio_${locale.code}`) ?? "")),
    }));

    // Bio and registration are reviewed independently, so each dirty one
    // becomes its own request — an admin can approve a new bio without also
    // having to accept a registration number they haven't sighted yet.
    const jobs: Array<Record<string, unknown>> = [];
    const bioChanged = translations.some(
      (entry) => (entry.bio ?? "") !== (initialBioSnapshot[entry.locale] ?? ""),
    );
    if (!bioLocked && bioChanged) {
      jobs.push({ field: "bio", countryId: market.countryId, translations });
    }
    const registrationChanged =
      JSON.stringify({ chamberEntity, registrationNumber, registrationDivision }) !==
      initialListingSnapshot;
    if (!registrationLocked && registrationChanged) {
      jobs.push({
        field: "registration",
        countryId: market.countryId,
        chamberEntity: chamberEntity.trim() || null,
        registrationNumber: registrationNumber.trim() || null,
        division: registrationDivision.trim() || null,
      });
    }
    if (jobs.length === 0) {
      setListingMsg({ kind: "error", text: strings.noChangesToSubmit });
      return;
    }

    startListingTransition(async () => {
      const errors = await submitChangeRequests(jobs, strings.submitApprovalFailed);
      setListingMsg(
        errors.length === 0
          ? { kind: "success", text: strings.changesSubmitted }
          : { kind: "error", text: errors.join(" ") },
      );
      router.refresh();
    });
  }

  function onSubmitPayout(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPayoutMsg(null);
    const bErr = bicError(bankBic, strings);
    const iErr = ibanError(bankIban, strings);
    setBicFieldError(bErr);
    setIbanFieldError(iErr);
    if (bErr || iErr) return;

    const payload: MarketPayoutPatchBody["bank"] = {
      accountHolder: bankAccountHolder.trim() || null,
      bic: bankBic.trim() || null,
    };
    if (bankIban.trim()) payload.iban = bankIban.trim();

    startPayoutTransition(async () => {
      try {
        const res = await fetch(`/api/doctor/profile/markets/${encodeURIComponent(market.countryId)}`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ bank: payload } satisfies MarketPayoutPatchBody),
        });
        const json = (await res.json()) as { ok?: boolean; message?: string };
        if (!res.ok || !json.ok) {
          setPayoutMsg({ kind: "error", text: json.message ?? strings.savePayoutFailed });
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

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-1.5">
        <Pill tone={market.isVerified ? "active" : "pending"}>
          {market.isVerified ? strings.verified : strings.needsVerification}
        </Pill>
        <Pill tone={market.bank.ibanSet ? "active" : "pending"}>
          {strings.payout}: {market.bank.ibanSet ? strings.onFile : strings.missing}
        </Pill>
      </div>

      {/* ── Country listing form (bio + registration — this market only) ── */}
      <form onSubmit={onSubmitListing}>
        <FormSection
          title={strings.countryListingSection.replace("{country}", market.country.name)}
          description={strings.countryListingSectionDesc.replace("{country}", market.country.name)}
          titleAs="h2"
        >
          <div className="gh-form-section__span-2">
            <p className="gh-status-info m-0 rounded-md border px-3 py-2 text-portal-label">
              {strings.countryListingApprovalHint.replace("{country}", market.country.name)}
            </p>
          </div>
          <div className="gh-form-section__span-2 flex flex-col gap-3">
            <div>
              <span className="gh-field-label inline-flex items-center gap-1.5">
                {strings.bioByLanguage}
                <Lock className="size-3" aria-label={strings.lockedBadge} />
              </span>
              <p className="mt-1 text-xs text-[var(--portal-muted)]">{strings.bioByLanguageHint}</p>
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
              <div key={locale.code} role="tabpanel" hidden={locale.code !== activeBioLocale}>
                <RichTextHtmlField
                  name={`bio_${locale.code}`}
                  label={strings.bioLabel.replace("{language}", localeLabel(locale.code, strings))}
                  initialValue={initialBioForLocale(locale.code)}
                  helperText={locale.isDefault ? strings.bioHelperDefault : strings.bioHelperNonDefault}
                  onChange={(html) => setBioByLocale((prev) => ({ ...prev, [locale.code]: html }))}
                  disabled={bioLocked}
                />
              </div>
            ))}
            {/* No renderValue: a proposed bio is rich text per locale, which
                doesn't read as an inline one-liner. The admin queue shows the
                full before/after instead. */}
            <ApprovalNotice
              request={bioRequest}
              strings={strings}
              busy={withdrawing}
              onWithdraw={withdraw}
            />
          </div>

          <div className="gh-form-section__span-2 gh-doctor-registration-card rounded-md border border-[var(--portal-line)] bg-[var(--portal-well)] p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <span className="gh-field-label inline-flex items-center gap-1.5">
                  {strings.registrationTitle.replace("{country}", market.country.name)}
                  <Lock className="size-3" aria-label={strings.lockedBadge} />
                </span>
                <p className="mt-1 text-xs text-[var(--portal-muted)]">{strings.registrationEditsHint}</p>
              </div>
              <span
                className={`rounded-full px-2.5 py-1 text-portal-thead font-semibold ${
                  market.isVerified
                    ? "gh-status-success border"
                    : "border border-[var(--portal-line)] bg-[var(--portal-bg)] text-[var(--portal-muted)]"
                }`}
              >
                {market.isVerified ? strings.verified : strings.needsVerification}
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
                  disabled={registrationLocked}
                />
              </label>
              <label className="flex flex-col gap-2">
                <span className="gh-field-label">{strings.registrationNumber}</span>
                <input
                  className="gh-input min-w-0"
                  value={registrationNumber}
                  onChange={(e) => setRegistrationNumber(e.target.value)}
                  maxLength={64}
                  disabled={registrationLocked}
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
                  disabled={registrationLocked}
                />
              </label>
            </div>
            <ApprovalNotice
              request={registrationRequest}
              strings={strings}
              busy={withdrawing}
              onWithdraw={withdraw}
              renderValue={(r) =>
                "registrationNumber" in r.proposedValue
                  ? [
                      r.proposedValue.chamberEntity,
                      r.proposedValue.registrationNumber,
                      r.proposedValue.division,
                    ]
                      .filter(Boolean)
                      .join(" · ") || "—"
                  : null
              }
            />
          </div>

          {listingMsg ? (
            <div className="gh-form-section__span-2">
              <MessageBanner msg={listingMsg} />
            </div>
          ) : null}

          <div className="gh-form-section__span-2 gh-doctor-form-actions flex justify-end">
            <button
              type="submit"
              disabled={listingPending || (bioLocked && registrationLocked)}
              className="gh-btn gh-btn-primary"
            >
              {listingPending
                ? strings.submitting
                : strings.submitCountryListing.replace("{country}", market.country.name)}
            </button>
          </div>
        </FormSection>
      </form>

      {/* ── Payout / bank details form ───────────── */}
      <form onSubmit={onSubmitPayout}>
        <FormSection
          title={strings.payoutDetailsSection}
          description={
            <>
              {strings.payoutDescCountry.replace("{country}", market.country.name)} {strings.payoutPrivateNote}
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
                market.bank.ibanSet
                  ? strings.ibanOnFilePlaceholder.replace("{masked}", market.bank.ibanMasked ?? "•••• ••••")
                  : ibanExample(market.country.code).iban
              }
            />
            {ibanFieldError ? (
              <span className="text-xs text-red-600">{ibanFieldError}</span>
            ) : (
              <span className="text-xs text-[var(--portal-muted)]">
                {market.bank.ibanSet ? strings.ibanOnFileHint : strings.ibanNewHint}
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
              placeholder={ibanExample(market.country.code).bic}
            />
            {bicFieldError ? <span className="text-xs text-red-600">{bicFieldError}</span> : null}
          </label>

          {payoutMsg ? (
            <div className="gh-form-section__span-2">
              <MessageBanner msg={payoutMsg} />
            </div>
          ) : null}

          <div className="gh-form-section__span-2 gh-doctor-form-actions flex justify-end">
            <button type="submit" disabled={payoutPending} className="gh-btn gh-btn-primary">
              {payoutPending ? strings.saving : strings.savePayoutDetails}
            </button>
          </div>
        </FormSection>
      </form>
    </div>
  );
}
