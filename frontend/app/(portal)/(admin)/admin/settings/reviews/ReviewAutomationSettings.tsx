"use client";

import { useState } from "react";
import type { AdminReviewSettings } from "@/lib/admin/admin-api/settings";
import { FormSection } from "@/components/FormSection";
import { ReviewCountrySettings } from "./ReviewCountrySettings";

export function ReviewAutomationSettings({ settings, section = "automation" }: { settings: AdminReviewSettings; section?: "automation" | "links" }) {
  const [timing, setTiming] = useState(settings.automation);
  const [doctify, setDoctify] = useState(settings.doctify.reviewUrl ?? "");
  const [trustpilot, setTrustpilot] = useState(settings.trustpilot.reviewUrl ?? "");
  return <>
    {section === "automation" ? <FormSection title="Email automation" description="Invite patients after completed consultations. At most one new sequence per patient every 90 days, across countries. Delivery retries do not count as follow-ups.">
      <label className="flex items-center gap-3"><input name="enabled" type="checkbox" defaultChecked={timing.enabled} /><span>Send review emails</span></label>
      <label className="flex flex-col gap-2"><span className="gh-field-label">First request: hours after completion</span><input name="delayHours" type="number" min={1} max={168} required className="gh-input" value={timing.delayHours} onChange={(e) => setTiming({ ...timing, delayHours: Number(e.target.value) })} /></label>
      <label className="flex flex-col gap-2"><span className="gh-field-label">Number of follow-ups</span><select name="maxFollowups" className="gh-select" value={timing.maxFollowups} onChange={(e) => setTiming({ ...timing, maxFollowups: Number(e.target.value) })}>{[0, 1, 2].map((n) => <option key={n} value={n}>{n}</option>)}</select></label>
      {timing.maxFollowups > 0 ? <label className="flex flex-col gap-2"><span className="gh-field-label">Days between follow-ups</span><input name="followupIntervalDays" type="number" min={3} max={14} required className="gh-input" value={timing.followupIntervalDays} onChange={(e) => setTiming({ ...timing, followupIntervalDays: Number(e.target.value) })} /></label> : <input name="followupIntervalDays" type="hidden" value={timing.followupIntervalDays} />}
      <p className="col-span-full text-sm" aria-live="polite">Sequence: completion → request after {timing.delayHours} hours{Array.from({ length: timing.maxFollowups }, (_, i) => ` → follow-up ${i + 1}, ${timing.followupIntervalDays} days after the previous successful email`).join("")}. Choosing a review site, reporting a review or opting out stops reminders. A site click does not confirm a posted review.</p>
      <p className="col-span-full text-sm text-[var(--color-text-muted)]">Timing changes apply to new sequences. Pausing and lowering the follow-up limit affect pending emails. Automation begins with consultations completed after its first activation; historical patients are not emailed.</p>
    </FormSection> : <>
    <FormSection title="Global Doctify and Trustpilot links" description="Paste the link patients use to write a review. Your one Doctify account serves every country. Trustpilot is optional.">
      {[{ name: "doctify", label: "Doctify", value: doctify, set: setDoctify }, { name: "trustpilot", label: "Trustpilot", value: trustpilot, set: setTrustpilot }].map((provider) => <label key={provider.name} className="flex flex-col gap-2"><span className="gh-field-label">{provider.label} global review link</span><input name={`${provider.name}ReviewUrl`} type="url" className="gh-input min-w-0" maxLength={500} value={provider.value} onChange={(e) => provider.set(e.target.value)} /><span className="text-xs">{provider.value ? "Configured — account not verified" : "Not connected"}</span>{provider.value.startsWith("https://") ? <a href={provider.value} target="_blank" rel="noopener noreferrer" className="underline">Open {provider.label} link</a> : null}</label>)}
    </FormSection>
    <ReviewCountrySettings destinations={settings.destinations} hasGlobalDestination={!!(doctify.trim() || trustpilot.trim())} />
    </>}
  </>;
}
