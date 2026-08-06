"use client";

import { useState } from "react";
import { ColumnPriorityTable, type ColumnPriorityField } from "@/components/ColumnPriorityTable";
import { Btn, Pill } from "../../_components/atoms";
import { ConfirmDeleteButton } from "../../_components/confirm-delete-button";
import type { MembershipBenefit } from "@/lib/admin/memberships-api";

export type ServiceOption = {
  id: string;
  name: string;
  kind: string;
  basePriceCents: number | null;
  currencyCode: string | null;
};

const KIND_LABEL: Record<string, string> = {
  GENERAL: "General consultations",
  SPECIALIST: "Specialist consultations",
};

function money(cents: number, currency: string | null): string {
  return `${(cents / 100).toFixed(2)} ${(currency ?? "EUR").toUpperCase()}`;
}

/** What the member pays for a `listCents` visit under this benefit, or null
 *  when the row gives nothing (EXCLUDED, or an exhausted allowance with no
 *  fallback). Mirrors §6.2 — Math.round, half-up, whole cents, same as the
 *  corporate engine — but is display-only: checkout always re-derives. */
function memberPrice(
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

function describeValue(benefit: MembershipBenefit): string {
  switch (benefit.benefitType) {
    case "ALLOWANCE":
      return `${benefit.allowanceCount ?? 0} included`;
    case "PERCENT":
      return `${benefit.percentOff ?? 0}% off`;
    case "FIXED":
      return benefit.fixedPriceCents == null
        ? "—"
        : money(benefit.fixedPriceCents, benefit.service?.currencyCode ?? null);
    case "EXCLUDED":
      return "No benefit";
    default:
      return "—";
  }
}

function describeFallback(benefit: MembershipBenefit): string {
  if (benefit.benefitType !== "ALLOWANCE" || benefit.fallbackType === "NONE") return "—";
  if (benefit.fallbackType === "PERCENT") return `then ${benefit.fallbackPercent ?? 0}% off`;
  return benefit.fallbackFixedCents == null
    ? "—"
    : `then ${money(benefit.fallbackFixedCents, benefit.service?.currencyCode ?? null)}`;
}

/**
 * The level's benefit rows plus the add form (§9.1).
 *
 * The add form is client-side only so the value fields can follow the chosen
 * type — otherwise an admin fills in a percentage, switches to "fixed price",
 * and submits a row the server rejects on a field that is no longer on screen.
 * The live preview line makes the peak-pricing interaction from §29 visible
 * while configuring: a percentage applies to the slot's peak-adjusted price, a
 * fixed price replaces it.
 */
export function MembershipBenefitTable({
  benefits,
  services,
  createBenefitAction,
  deleteBenefitAction,
}: {
  benefits: MembershipBenefit[];
  services: ServiceOption[];
  createBenefitAction: (formData: FormData) => void;
  deleteBenefitAction: (formData: FormData) => void;
}) {
  const [targetMode, setTargetMode] = useState<"kind" | "service">("kind");
  const [benefitType, setBenefitType] = useState("ALLOWANCE");
  const [fallbackType, setFallbackType] = useState("NONE");
  const [serviceId, setServiceId] = useState("");
  const [allowanceCount, setAllowanceCount] = useState("4");
  const [percentOff, setPercentOff] = useState("20");
  const [fixedPriceMajor, setFixedPriceMajor] = useState("");
  const [fallbackPercent, setFallbackPercent] = useState("20");
  const [fallbackFixedMajor, setFallbackFixedMajor] = useState("");

  const pickedService = services.find((s) => s.id === serviceId);
  // A kind-targeted row covers many services at different prices, so the
  // preview uses a nominal 60.00 and says so.
  const previewList = (targetMode === "service" && pickedService?.basePriceCents) || 6000;
  const previewCurrency = pickedService?.currencyCode ?? "EUR";
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

  const fields: ColumnPriorityField<MembershipBenefit>[] = [
    {
      key: "target",
      label: "Applies to",
      priority: 1,
      cardPrimary: true,
      render: (benefit) => (
        <div className="flex flex-col">
          <span className="font-semibold text-[var(--color-text-primary)]">
            {benefit.service
              ? benefit.service.name
              : (KIND_LABEL[benefit.serviceKind ?? ""] ?? benefit.serviceKind ?? "—")}
          </span>
          <span className="text-xs text-[var(--color-text-muted)]">
            {benefit.service ? "This service only" : "Every service of this type"}
          </span>
        </div>
      ),
    },
    {
      key: "type",
      label: "Type",
      priority: 2,
      render: (benefit) => benefit.benefitType.toLowerCase(),
    },
    {
      key: "value",
      label: "Member gets",
      priority: 1,
      render: (benefit) => describeValue(benefit),
    },
    {
      key: "fallback",
      label: "After the allowance",
      cardLabel: "After the allowance",
      priority: 3,
      render: (benefit) => describeFallback(benefit),
    },
    {
      key: "status",
      label: "Status",
      priority: 2,
      render: (benefit) =>
        benefit.isActive ? <Pill tone="active">Active</Pill> : <Pill tone="inactive">Inactive</Pill>,
    },
    {
      key: "actions",
      label: "Actions",
      priority: 1,
      desktopOnly: true,
      render: (benefit) => (
        <form action={deleteBenefitAction}>
          <input type="hidden" name="benefitId" value={benefit.id} />
          <ConfirmDeleteButton
            message="Remove this benefit? Bookings already made keep the price they were charged."
            className="text-portal-compact font-semibold text-[var(--color-status-error-text)] hover:underline"
          >
            Remove
          </ConfirmDeleteButton>
        </form>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      {benefits.length > 0 ? (
        <ColumnPriorityTable
          fields={fields}
          rows={benefits}
          getRowKey={(benefit) => benefit.id}
          cardTone={(benefit) => (benefit.isActive ? "success" : "neutral")}
        />
      ) : (
        <p className="text-sm text-[var(--color-text-muted)]">
          No benefits yet. Until you add one, this level gives members nothing.
        </p>
      )}

      <form action={createBenefitAction} className="flex flex-col gap-4 border-t border-[var(--color-border)] pt-6">
        <h4 className="text-sm font-semibold text-[var(--color-text-primary)]">Add a benefit</h4>

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
                onChange={() => setTargetMode("service")}
              />
              <span className="text-sm">One specific service</span>
            </label>
          </div>
        </fieldset>

        {targetMode === "kind" ? (
          <label className="flex flex-col gap-1.5">
            <span className="gh-field-label">Consultation type</span>
            <select name="serviceKind" className="gh-select max-w-[320px]" defaultValue="GENERAL">
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
              {services.map((service) => (
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
            onChange={(ev) => setBenefitType(ev.target.value)}
          >
            <option value="ALLOWANCE">A number of included consultations</option>
            <option value="PERCENT">A percentage off</option>
            <option value="FIXED">A fixed member price</option>
            <option value="EXCLUDED">Nothing — carve this out</option>
          </select>
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
                onChange={(ev) => setFallbackType(ev.target.value)}
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
                <span className="gh-field-label">Then price</span>
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
            <span className="gh-field-label">Member price</span>
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
            </span>
          </label>
        ) : null}

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

        <input type="hidden" name="isActive" value="on" />
        <div className="flex justify-end">
          <Btn type="submit">Add benefit</Btn>
        </div>
      </form>
    </div>
  );
}
