"use client";

import { useState } from "react";
import type { AdminReviewSettings } from "@/lib/admin/admin-api/settings";
import { FormSection } from "@/components/FormSection";
import { ColumnPriorityTable } from "@/components/ColumnPriorityTable";

type Country = AdminReviewSettings["destinations"][number];
export function ReviewCountrySettings({ destinations, hasGlobalDestination }: { destinations: Country[]; hasGlobalDestination: boolean }) {
  const [countries, setCountries] = useState(destinations);
  function update(code: string, patch: Partial<Country>) {
    setCountries((rows) => rows.map((row) => row.countryCode === code ? { ...row, ...patch } : row));
  }
  return <FormSection title="Countries" description="Google links belong to each country. Shared Doctify and Trustpilot links work in every enabled country. Configured means a link is saved, not that its account has been verified.">
    <div className="col-span-full min-w-0">
      <ColumnPriorityTable rows={countries} getRowKey={(row) => row.countryCode} fields={[
        { key: "country", label: "Country", priority: 1, cardPrimary: true, render: (row) => row.countryName },
        { key: "google", label: "Google review link", priority: 1, render: (row) => <input type="url" aria-label={`${row.countryName} Google review link`} className="gh-input min-w-0 w-full" maxLength={500} value={row.googleReviewUrl ?? ""} onChange={(e) => update(row.countryCode, { googleReviewUrl: e.target.value })} /> },
        { key: "enabled", label: "Sending enabled", priority: 1, render: (row) => <input type="checkbox" aria-label={`Send review emails in ${row.countryName}`} disabled={!row.isActive} checked={row.sendReviewRequests} onChange={(e) => update(row.countryCode, { sendReviewRequests: e.target.checked })} /> },
        { key: "readiness", label: "Readiness", priority: 1, render: (row) => !row.isActive ? "Country inactive — sending paused" : hasGlobalDestination || row.googleReviewUrl?.trim() ? "Configured" : "Add a review link" },
      ]} />
      {countries.map((row) => <div key={row.countryCode}>
        <input type="hidden" name={`googleReviewUrl_${row.countryCode}`} value={row.googleReviewUrl ?? ""} />
        <input type="hidden" name={`sendReviewRequests_${row.countryCode}`} value={String(row.sendReviewRequests)} />
      </div>)}
    </div>
  </FormSection>;
}
