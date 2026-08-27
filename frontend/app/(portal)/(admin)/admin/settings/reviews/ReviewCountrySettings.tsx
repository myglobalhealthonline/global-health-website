"use client";

import { useState } from "react";
import type { AdminReviewSettings } from "@/lib/admin/admin-api/settings";
import { FormSection } from "@/components/FormSection";

type CountryDestination = AdminReviewSettings["destinations"][number];

export function ReviewCountrySettings({
  destinations,
}: {
  destinations: CountryDestination[];
}) {
  const [selectedCode, setSelectedCode] = useState(destinations[0]?.countryCode ?? "");
  const [countries, setCountries] = useState(destinations);

  if (countries.length === 0) {
    return (
      <FormSection
        title="Country review delivery"
        description="No active countries are available."
      >
        <p className="text-sm text-[var(--color-text-muted)]">
          Activate a country before configuring Google review delivery.
        </p>
      </FormSection>
    );
  }

  const selected =
    countries.find((country) => country.countryCode === selectedCode) ?? countries[0];

  function updateSelected(patch: Partial<CountryDestination>) {
    setCountries((current) =>
      current.map((country) =>
        country.countryCode === selected.countryCode
          ? { ...country, ...patch }
          : country,
      ),
    );
  }

  return (
    <FormSection
      title="Country review delivery"
      description="Choose a country, add its Google Business Profile link, and decide whether patients in that market should receive review requests."
    >
      <label className="flex flex-col gap-2">
        <span className="gh-field-label">Country</span>
        <select
          className="gh-select min-w-0"
          value={selected.countryCode}
          onChange={(event) => setSelectedCode(event.target.value)}
        >
          {countries.map((country) => (
            <option key={country.countryCode} value={country.countryCode}>
              {country.countryName} ({country.countryCode}) — {country.sendReviewRequests ? "Enabled" : "Disabled"}
            </option>
          ))}
        </select>
        <span className="text-xs text-[var(--color-text-muted)]">
          Settings below apply only to consultations booked in {selected.countryName}.
        </span>
      </label>

      <div className="flex flex-col gap-2">
        <span className="gh-field-label">Review requests</span>
        <div className="flex min-h-11 items-center justify-between gap-4 rounded-[var(--radius-card-sm)] border border-[var(--color-border)] px-4 py-2.5">
          <div className="min-w-0">
            <p className="m-0 text-sm font-semibold text-[var(--color-text-primary)]">
              {selected.sendReviewRequests ? "Enabled" : "Disabled"}
            </p>
            <p className="m-0 text-xs text-[var(--color-text-muted)]">
              {selected.sendReviewRequests
                ? `Patients in ${selected.countryName} can receive review requests.`
                : `No new review requests will be sent in ${selected.countryName}.`}
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={selected.sendReviewRequests}
            aria-label={`Send review requests in ${selected.countryName}`}
            onClick={() =>
              updateSelected({ sendReviewRequests: !selected.sendReviewRequests })
            }
            className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full border transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--portal-primary)] focus-visible:ring-offset-2 active:scale-[0.98] ${
              selected.sendReviewRequests
                ? "border-[var(--portal-primary)] bg-[var(--portal-primary)]"
                : "border-[var(--color-border-strong)] bg-[var(--color-border)]"
            }`}
          >
            <span
              aria-hidden
              className={`block size-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${
                selected.sendReviewRequests ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </div>
      </div>

      <label className="flex flex-col gap-2">
        <span className="gh-field-label">
          {selected.countryName} Google Business Profile review URL
        </span>
        <input
          name={`googleReviewUrl_${selected.countryCode}`}
          type="url"
          className="gh-input min-w-0"
          maxLength={500}
          placeholder="https://search.google.com/local/writereview?placeid=..."
          value={selected.googleReviewUrl ?? ""}
          onChange={(event) => updateSelected({ googleReviewUrl: event.target.value })}
        />
        <span className="text-xs text-[var(--color-text-muted)]">
          This is the only profile link that changes by country.
        </span>
      </label>

      {countries.map((country) => (
        <div key={country.countryCode} hidden={country.countryCode === selected.countryCode}>
          <input
            type="hidden"
            name={`googleReviewUrl_${country.countryCode}`}
            value={country.googleReviewUrl ?? ""}
          />
        </div>
      ))}
      {countries.map((country) => (
        <input
          key={`enabled-${country.countryCode}`}
          type="hidden"
          name={`sendReviewRequests_${country.countryCode}`}
          value={country.sendReviewRequests ? "true" : "false"}
        />
      ))}
    </FormSection>
  );
}
