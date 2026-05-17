"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

/**
 * Doctor self-edit profile form. Only mutates the fields the doctor is
 * trusted to manage themselves — country, slug, IMC registration, and
 * the specialty list are admin-managed because they affect public
 * routing and verification copy.
 *
 * POSTs to the same-origin proxy at `/api/doctor/profile` (Railway
 * cookies don't traverse subdomains, so a direct backend call would
 * be unauthenticated).
 */

type Initial = {
  fullName: string;
  bio: string;
  qualifications: string[];
  languages: string[];
  whatsappNumber: string;
};

export function DoctorProfileEditForm({ initial }: { initial: Initial }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [fullName, setFullName] = useState(initial.fullName);
  const [bio, setBio] = useState(initial.bio);
  const [qualifications, setQualifications] = useState(
    initial.qualifications.join("\n"),
  );
  const [languages, setLanguages] = useState(initial.languages.join(", "));
  const [whatsappNumber, setWhatsappNumber] = useState(initial.whatsappNumber);
  const [message, setMessage] = useState<
    { kind: "success" | "error"; text: string } | null
  >(null);

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    const payload = {
      fullName: fullName.trim(),
      bio: bio.trim() || null,
      qualifications: qualifications
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean),
      languages: languages
        .split(",")
        .map((line) => line.trim())
        .filter(Boolean),
      whatsappNumber: whatsappNumber.trim() || null,
    };
    startTransition(async () => {
      try {
        const res = await fetch("/api/doctor/profile", {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload),
        });
        const json = (await res.json()) as {
          ok?: boolean;
          message?: string;
        };
        if (!res.ok || !json.ok) {
          setMessage({
            kind: "error",
            text: json.message ?? "Could not save profile",
          });
          return;
        }
        setMessage({ kind: "success", text: json.message ?? "Profile updated" });
        router.refresh();
      } catch {
        setMessage({ kind: "error", text: "Network error — try again" });
      }
    });
  }

  return (
    <form
      onSubmit={onSubmit}
      className="grid gap-4"
      style={{ gridTemplateColumns: "minmax(0, 2fr) minmax(0, 1fr)" }}
    >
      <div className="grid gap-4">
        <section className="gh-card p-6">
          <h3
            className="m-0 text-[var(--color-text-primary)]"
            style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 800 }}
          >
            Public profile
          </h3>
          <p className="mt-1 text-[13px] text-[var(--color-text-muted)]">
            Patients see this on your doctor card and profile page.
          </p>

          <div className="mt-4 flex flex-col gap-4">
            <label className="flex flex-col gap-2">
              <span className="gh-field-label">Full name</span>
              <input
                className="gh-input min-w-0"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                maxLength={200}
                required
              />
            </label>

            <label className="flex flex-col gap-2">
              <span className="gh-field-label">Bio</span>
              <textarea
                className="gh-input min-h-[10rem] min-w-0 resize-y"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                maxLength={12000}
                placeholder="One or two paragraphs about your practice, training, and approach."
              />
              <span className="text-xs text-[var(--color-text-muted)]">
                Plain text. Line breaks are preserved on the public page.
              </span>
            </label>

            <label className="flex flex-col gap-2">
              <span className="gh-field-label">Qualifications</span>
              <textarea
                className="gh-input min-h-[8rem] min-w-0 resize-y"
                value={qualifications}
                onChange={(e) => setQualifications(e.target.value)}
                placeholder={"MB BCh BAO\nMRCPI\nFellowship in Cardiology"}
              />
              <span className="text-xs text-[var(--color-text-muted)]">
                One per line. Shown as a bullet list on your public profile.
              </span>
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="flex flex-col gap-2">
                <span className="gh-field-label">Languages</span>
                <input
                  className="gh-input min-w-0"
                  value={languages}
                  onChange={(e) => setLanguages(e.target.value)}
                  placeholder="English, Portuguese"
                />
                <span className="text-xs text-[var(--color-text-muted)]">
                  Comma-separated. Used on public doctor cards.
                </span>
              </label>
              <label className="flex flex-col gap-2">
                <span className="gh-field-label">WhatsApp number</span>
                <input
                  className="gh-input min-w-0"
                  value={whatsappNumber}
                  onChange={(e) => setWhatsappNumber(e.target.value)}
                  maxLength={32}
                  placeholder="+353871234567"
                />
                <span className="text-xs text-[var(--color-text-muted)]">
                  Optional. Patients can message you directly when set.
                </span>
              </label>
            </div>
          </div>

          {message ? (
            <p
              className={`${
                message.kind === "success" ? "gh-status-success" : "gh-status-warning"
              } mt-4 rounded-md border px-4 py-3 text-sm`}
            >
              {message.text}
            </p>
          ) : null}

          <div className="mt-5 flex justify-end">
            <button
              type="submit"
              disabled={pending}
              className="gh-btn gh-btn-primary"
            >
              {pending ? "Saving…" : "Save changes"}
            </button>
          </div>
        </section>
      </div>

      <aside className="grid gap-4 self-start">
        <section className="gh-card p-6">
          <h3
            className="m-0 text-[var(--color-text-primary)]"
            style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 800 }}
          >
            Admin-managed
          </h3>
          <p className="mt-1 text-[13px] text-[var(--color-text-muted)]">
            Need a change to your country, URL slug, profile photo, IMC
            registration, or eligible specialties? Email support — admins
            update these to keep verification + routing consistent.
          </p>
        </section>
      </aside>
    </form>
  );
}
