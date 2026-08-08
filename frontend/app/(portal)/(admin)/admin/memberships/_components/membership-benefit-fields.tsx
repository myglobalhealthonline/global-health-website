"use client";

import { useState } from "react";
import type { MembershipBenefit } from "@/lib/admin/memberships-api";

export type ServiceOption = {
  id: string;
  name: string;
  kind: string;
  basePriceCents: number | null;
  currencyCode: string | null;
};

export const KIND_LABEL: Record<string, string> = {
  GENERAL: "General consultations",
  SPECIALIST: "Specialist consultations",
};

export function money(cents: number, currency: string | null): string {
  return `${(cents / 100).toFixed(2)} ${(currency ?? "EUR").toUpperCase()}`;
}

/** What the member pays for a `listCents` visit under this benefit, or null
 *  when the row gives nothing (EXCLUDED, or an exhausted allowance with no
 *  fallback). Mirrors §6.2 — Math.round, half-up, whole cents, same as the
 *  corporate engine — but is display-only: checkout always re-derives. */
export function memberPrice(
  benefit: Pick<
    MembershipBenefit,
    "benefitType" | "percentOff" | "fixedPriceCents" | "fallbackType" | "fallbackPercent" | "fallbackFixedCents"
  >,
  listCents: number,
  exhausted = false,
): number | null {
  if (benefit.benefitType === "EXCLUDED") return null;
  if (benefit.benefitType === "PERCENT") {
    return benefit.percentOff == null
      ? null
      : Math.round((listCents * (100 - benefit.percentOff)) / 100);
  }
  if (benefit.benefitType === "FIXED") return benefit.fixedPriceCents ?? null;
  // ALLOWANCE: free while units remain, then the fallback (or full price).
  if (!exhausted) return 0;
  if (benefit.fallbackType === "PERCENT") {
    return benefit.fallbackPercent == null
      ? null
      : Math.round((listCents * (100 - benefit.fallbackPercent)) / 100);
  }
  if (benefit.fallbackType === "FIXED") return benefit.fallbackFixedCents ?? null;
  return listCents;
}

function centsToMajor(cents: number | null | undefined): string {
  return cents == null ? "" : (cents / 100).toFixed(2);
}

/**
 * The benefit form body: target, type, the type's value fields, the fallback,
 * and the §9.1 live preview.
 *
 * Shared verbatim by "add a benefit" and the edit dialog. Both post the same
 * field names to `parseMembershipBenefitForm`, so the two paths cannot drift —
 * an edit form that had grown its own copy of these controls is exactly how a
 * field silently stops being editable on a money path.
 *
 * Client-side because the value fields follow the chosen type: otherwise an
 * admin fills in a percentage, switches to "fixed price", and submits a row the
 * server rejects on a field that is no longer on screen.
 */
export function MembershipBenefitFields({
  services,
  benefit,
  currencyCode,
}: {
  services: ServiceOption[];
  /** Prefill for the edit dialog. Omitted for the add form. */
  benefit?: MembershipBenefit;
  /**
   * The currency of the country this row configures. A `FIXED` amount is stored
   * in it and never converted (§22, §39), so it is named beside every money
   * field — the alternative is 800 typed into a EUR row by someone thinking in
   * CZK, which no validation can catch.
   */
  currencyCode?: string | null;
}) {
  const [targetMode, setTargetMode] = useState<"kind" | "service">(
    benefit?.serviceId ? "service" : "kind",
  );
  const [benefitType, setBenefitType] = useState(benefit?.benefitType ?? "ALLOWANCE");
  const [fallbackType, setFallbackType] = useState(benefit?.fallbackType ?? "NONE");
  const [serviceId, setServiceId] = useState(benefit?.serviceId ?? "");
  const [allowanceCount, setAllowanceCount] = useState(String(benefit?.allowanceCount ?? 4));
  const [percentOff, setPercentOff] = useState(String(benefit?.percentOff ?? 20));
  const [fixedPriceMajor, setFixedPriceMajor] = useState(centsToMajor(benefit?.fixedPriceCents));
  const [fallbackPercent, setFallbackPercent] = useState(String(benefit?.fallbackPercent ?? 20));
  const [fallbackFixedMajor, setFallbackFixedMajor] = useState(
    centsToMajor(benefit?.fallbackFixedCents),
  );

  // A row can target a service that is missing from the picker's list (it is
  // capped at 100 per kind), and an option the browser never renders would be
  // silently dropped on save. Carry the row's own service in as an option.
  const serviceChoices: ServiceOption[] =
    benefit?.service && !services.some((s) => s.id === benefit.service?.id)
      ? [...services, { ...benefit.service }]
      : services;

  // §21.3: an allowance may only live on a service-KIND row. A service-scoped
  // pool cannot be shared across countries — `Service` rows are per-country and
  // there is no reliable mapping between a Czech service and its Irish
  // counterpart. A CHECK constraint and the Zod refine both reject it, so the
  // option is disabled here rather than left to bounce after a save.
  const allowanceBlocked = targetMode === "service";

  const pickedService = serviceChoices.find((s) => s.id === serviceId);
  // A kind-targeted row covers many services at different prices, so the
  // preview uses a nominal 60.00 and says so.
  const previewList = (targetMode === "service" && pickedService?.basePriceCents) || 6000;
  const previewCurrency = pickedService?.currencyCode ?? currencyCode ?? "EUR";
  const moneyLabel = (currencyCode ?? pickedService?.currencyCode ?? "").toUpperCase();
  const isNominal = !(targetMode === "service" && pickedService?.basePriceCents);

  const draft = {
    benefitType: benefitType as MembershipBenefit["benefitType"],
    percentOff: Number.parseFloat(percentOff.replace(",", ".")) || null,
    fixedPriceCents: fixedPriceMajor
      ? Math.round(Number.parseFloat(fixedPriceMajor.replace(",", ".")) * 100)
      : null,
    fallbackType: fallbackType as MembershipBenefit["fallbackType"],
    fallbackPercent: Number.parseFloat(fallbackPercent.replace(",", ".")) || null,
    fallbackFixedCents: fallbackFixedMajor
      ? Math.round(Number.parseFloat(fallbackFixedMajor.replace(",", ".")) * 100)
      : null,
  };
  const previewNow = memberPrice(draft, previewList, false);
  const previewAfter =
    benefitType === "ALLOWANCE" ? memberPrice(draft, previewList, true) : null;

  return (
    <>
      <fieldset className="flex flex-col gap-2">
        <legend className="gh-field-label">Applies to</legend>
        <div className="flex flex-wrap gap-4">
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="targetMode"
              value="kind"
              checked={targetMode === "kind"}
              onChange={() => setTargetMode("kind")}
            />
            <span className="text-sm">A type of consultation</span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="targetMode"
              value="service"
              checked={targetMode === "service"}
              onChange={() => {
                setTargetMode("service");
                // The type follows the target rather than waiting to be
                // refused: an allowance on one service is rejected by a CHECK,
                // by the Zod refine and by the option below.
                if (benefitType === "ALLOWANCE") setBenefitType("PERCENT");
              }}
            />
            <span className="text-sm">One specific service</span>
          </label>
        </div>
      </fieldset>

      {targetMode === "kind" ? (
        <label className="flex flex-col gap-1.5">
          <span className="gh-field-label">Consultation type</span>
          <select
            name="serviceKind"
            className="gh-select max-w-[320px]"
            defaultValue={benefit?.serviceKind ?? "GENERAL"}
          >
            <option value="GENERAL">{KIND_LABEL.GENERAL}</option>
            <option value="SPECIALIST">{KIND_LABEL.SPECIALIST}</option>
          </select>
        </label>
      ) : (
        <label className="flex flex-col gap-1.5">
          <span className="gh-field-label">Service</span>
          <select
            name="serviceId"
            className="gh-select max-w-[420px]"
            value={serviceId}
            onChange={(ev) => setServiceId(ev.target.value)}
            required
          >
            <option value="">Select a service…</option>
            {serviceChoices.map((service) => (
              <option key={service.id} value={service.id}>
                {service.name} ({KIND_LABEL[service.kind] ?? service.kind})
                {service.basePriceCents != null
                  ? ` — ${money(service.basePriceCents, service.currencyCode)}`
                  : ""}
              </option>
            ))}
          </select>
          <span className="text-xs text-[var(--color-text-muted)]">
            A rule for one service always wins over the rule for its type.
          </span>
        </label>
      )}

      <label className="flex flex-col gap-1.5">
        <span className="gh-field-label">What the member gets</span>
        <select
          name="benefitType"
          className="gh-select max-w-[320px]"
          value={benefitType}
          onChange={(ev) => setBenefitType(ev.target.value as MembershipBenefit["benefitType"])}
        >
          <option value="ALLOWANCE" disabled={allowanceBlocked}>
            A number of included consultations
          </option>
          <option value="PERCENT">A percentage off</option>
          <option value="FIXED">A fixed member price</option>
          <option value="EXCLUDED">Nothing — carve this out</option>
        </select>
        {allowanceBlocked ? (
          <span className="text-xs text-[var(--color-text-muted)]">
            Included consultations cover a whole consultation type, not one service — the pool is
            shared across every country the programme covers, and a single country&apos;s service
            can&apos;t hold it.
          </span>
        ) : null}
      </label>

      {benefitType === "ALLOWANCE" ? (
        <div className="flex flex-wrap items-end gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="gh-field-label">Included consultations</span>
            <input
              name="allowanceCount"
              className="gh-input max-w-[140px]"
              type="number"
              min={1}
              max={999}
              value={allowanceCount}
              onChange={(ev) => setAllowanceCount(ev.target.value)}
              required
            />
            <span className="text-xs text-[var(--color-text-muted)]">
              A fixed pool for the whole term — it does not reset monthly.
            </span>
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="gh-field-label">Once they run out</span>
            <select
              name="fallbackType"
              className="gh-select max-w-[240px]"
              value={fallbackType}
              onChange={(ev) => setFallbackType(ev.target.value as MembershipBenefit["fallbackType"])}
            >
              <option value="NONE">Pay full price</option>
              <option value="PERCENT">A percentage off</option>
              <option value="FIXED">A fixed member price</option>
            </select>
          </label>
          {fallbackType === "PERCENT" ? (
            <label className="flex flex-col gap-1.5">
              <span className="gh-field-label">Then % off</span>
              <input
                name="fallbackPercent"
                className="gh-input max-w-[120px]"
                inputMode="decimal"
                value={fallbackPercent}
                onChange={(ev) => setFallbackPercent(ev.target.value)}
                required
              />
            </label>
          ) : null}
          {fallbackType === "FIXED" ? (
            <label className="flex flex-col gap-1.5">
              <span className="gh-field-label">
                Then price{moneyLabel ? ` (${moneyLabel})` : ""}
              </span>
              <input
                name="fallbackFixedMajor"
                className="gh-input max-w-[140px]"
                inputMode="decimal"
                value={fallbackFixedMajor}
                onChange={(ev) => setFallbackFixedMajor(ev.target.value)}
                required
              />
            </label>
          ) : null}
        </div>
      ) : null}

      {benefitType === "PERCENT" ? (
        <label className="flex flex-col gap-1.5">
          <span className="gh-field-label">Percentage off</span>
          <input
            name="percentOff"
            className="gh-input max-w-[140px]"
            inputMode="decimal"
            value={percentOff}
            onChange={(ev) => setPercentOff(ev.target.value)}
            required
          />
          <span className="text-xs text-[var(--color-text-muted)]">
            Applied to the slot&apos;s price, including any evening or weekend uplift.
          </span>
        </label>
      ) : null}

      {benefitType === "FIXED" ? (
        <label className="flex flex-col gap-1.5">
          <span className="gh-field-label">
            Member price{moneyLabel ? ` (${moneyLabel})` : ""}
          </span>
          <input
            name="fixedPriceMajor"
            className="gh-input max-w-[160px]"
            inputMode="decimal"
            value={fixedPriceMajor}
            onChange={(ev) => setFixedPriceMajor(ev.target.value)}
            placeholder="45.00"
            required
          />
          <span className="text-xs text-[var(--color-text-muted)]">
            Replaces the slot price outright — evening and weekend uplifts do not apply.
            {moneyLabel
              ? ` Stored in ${moneyLabel} and never converted, so set it per country.`
              : ""}
          </span>
        </label>
      ) : null}

      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          name="isActive"
          defaultChecked={benefit ? benefit.isActive : true}
        />
        <span className="text-sm">
          Active — an inactive row keeps its history but stops applying to new bookings
        </span>
      </label>

      {/* §9.1 live preview — makes the peak interaction visible while configuring. */}
      <p className="rounded-[var(--radius-card-sm)] bg-[var(--color-surface-2)] px-4 py-3 text-sm text-[var(--color-text-muted)]">
        {benefitType === "EXCLUDED" ? (
          <>This carves the service out: the member pays full price for it.</>
        ) : (
          <>
            On a{" "}
            <strong className="text-[var(--color-text-primary)]">
              {money(previewList, previewCurrency)}
            </strong>{" "}
            consultation, a member pays{" "}
            <strong className="text-[var(--color-text-primary)]">
              {previewNow == null ? "—" : money(previewNow, previewCurrency)}
            </strong>
            {previewAfter != null ? (
              <>
                , then{" "}
                <strong className="text-[var(--color-text-primary)]">
                  {money(previewAfter, previewCurrency)}
                </strong>{" "}
                once the included visits are used
              </>
            ) : null}
            .{isNominal ? " Example price — a rule for a consultation type covers services at different prices." : ""}
          </>
        )}
      </p>
    </>
  );
}
