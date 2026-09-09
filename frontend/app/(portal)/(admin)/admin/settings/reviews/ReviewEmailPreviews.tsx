"use client";
import { useState } from "react";
import type { ReviewEmailPreview } from "@/lib/admin/admin-api/settings";
import { FormSection } from "@/components/FormSection";
export function ReviewEmailPreviews({ previews }: { previews: ReviewEmailPreview[] }) {
  const [locale, setLocale] = useState("en");
  const [reminder, setReminder] = useState(false);
  const preview = previews.find((item) => item.locale === locale && item.reminder === reminder);
  return <FormSection title="Email preview" description="The actual email template in every supported language. Preview links do not send emails.">
    <label className="flex flex-col gap-2">Language<select className="gh-select" value={locale} onChange={(e) => setLocale(e.target.value)}>{[["en", "English"], ["cs", "Czech"], ["pt", "Portuguese"], ["es", "Spanish"], ["ro", "Romanian"], ["pt-BR", "Brazilian Portuguese"]].map(([code, label]) => <option key={code} value={code}>{label}</option>)}</select></label>
    <label className="flex flex-col gap-2">Email<select className="gh-select" value={String(reminder)} onChange={(e) => setReminder(e.target.value === "true")}><option value="false">Initial request</option><option value="true">Follow-up</option></select></label>
    {preview ? <div className="col-span-full"><p className="mb-2 text-sm font-semibold">Subject: {preview.subject}</p><iframe title="Review email preview" sandbox="" referrerPolicy="no-referrer" srcDoc={preview.html} className="h-[580px] w-full rounded border border-[var(--color-border)] bg-white" /></div> : null}
  </FormSection>;
}
