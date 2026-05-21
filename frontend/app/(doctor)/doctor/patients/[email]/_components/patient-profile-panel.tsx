"use client";

import { useEffect, useState, useTransition } from "react";
import { Link2 } from "lucide-react";

type Profile = {
  weightKg: number | null;
  heightM: number | null;
  bmi: number | null;
  bloodType: string | null;
  allergies: string[];
};

export function PatientProfilePanel({ email }: { email: string }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [pending, startTransition] = useTransition();
  const [uploadMsg, setUploadMsg] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/doctor/patients/${encodeURIComponent(email)}/profile`)
      .then((r) => r.json())
      .then((json: { ok?: boolean; data?: { profile?: Profile | null } }) => {
        if (json.ok && json.data?.profile) setProfile(json.data.profile);
      })
      .catch(() => {});
  }, [email]);

  function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fd = new FormData(event.currentTarget);
    const payload = {
      weightKg: fd.get("weightKg") ? Number(fd.get("weightKg")) : null,
      heightM: fd.get("heightM") ? Number(fd.get("heightM")) : null,
      bloodType: String(fd.get("bloodType") ?? "").trim() || null,
      allergies: String(fd.get("allergies") ?? "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    };
    startTransition(async () => {
      await fetch(`/api/doctor/patients/${encodeURIComponent(email)}/profile`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
    });
  }

  function sendUploadLink() {
    setUploadMsg(null);
    startTransition(async () => {
      const res = await fetch(
        `/api/doctor/patients/${encodeURIComponent(email)}/upload-link`,
        { method: "POST" },
      );
      const json = (await res.json()) as {
        ok?: boolean;
        message?: string;
        data?: { link?: string };
      };
      if (!res.ok || !json.ok) {
        setUploadMsg(json.message ?? "Could not send link");
        return;
      }
      setUploadMsg("Upload link emailed to patient.");
    });
  }

  return (
    <section className="gh-card p-6">
      <h3 className="text-base font-bold text-[var(--color-text-primary)]">Patient chart</h3>
      <form className="mt-3 grid gap-3 text-sm" onSubmit={save}>
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="flex flex-col gap-1">
            <span className="gh-field-label">Weight (kg)</span>
            <input
              name="weightKg"
              type="number"
              step="0.1"
              defaultValue={profile?.weightKg ?? ""}
              className="gh-input"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="gh-field-label">Height (m)</span>
            <input
              name="heightM"
              type="number"
              step="0.01"
              defaultValue={profile?.heightM ?? ""}
              className="gh-input"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="gh-field-label">Blood type</span>
            <input
              name="bloodType"
              defaultValue={profile?.bloodType ?? ""}
              className="gh-input"
            />
          </label>
        </div>
        <label className="flex flex-col gap-1">
          <span className="gh-field-label">Allergies (comma-separated)</span>
          <input
            name="allergies"
            defaultValue={profile?.allergies?.join(", ") ?? ""}
            className="gh-input"
          />
        </label>
        <button type="submit" disabled={pending} className="gh-btn gh-btn-soft text-sm w-fit">
          Save chart
        </button>
      </form>
      <div className="mt-4 border-t border-[var(--color-border)] pt-4">
        <button
          type="button"
          disabled={pending}
          onClick={sendUploadLink}
          className="gh-btn gh-btn-primary text-sm"
        >
          <Link2 className="size-3.5" aria-hidden /> Send upload link
        </button>
        {uploadMsg ? (
          <p className="mt-2 text-sm text-[var(--color-text-muted)]">{uploadMsg}</p>
        ) : null}
      </div>
    </section>
  );
}
