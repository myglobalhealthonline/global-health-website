"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Upload, Trash2 } from "lucide-react";

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
  profileImagePath: string | null;
};

export function DoctorProfileEditForm({ initial }: { initial: Initial }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [photoPending, startPhotoTransition] = useTransition();
  const [fullName, setFullName] = useState(initial.fullName);
  const [bio, setBio] = useState(initial.bio);
  const [qualifications, setQualifications] = useState(
    initial.qualifications.join("\n"),
  );
  const [languages, setLanguages] = useState(initial.languages.join(", "));
  const [whatsappNumber, setWhatsappNumber] = useState(initial.whatsappNumber);
  const [photoPath, setPhotoPath] = useState<string | null>(
    initial.profileImagePath,
  );
  const [photoError, setPhotoError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<
    { kind: "success" | "error"; text: string } | null
  >(null);

  function uploadPhoto(file: File) {
    setPhotoError(null);
    if (file.size > 5 * 1024 * 1024) {
      setPhotoError("File too large (max 5MB).");
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
          setPhotoError(json.message ?? "Upload failed");
          return;
        }
        if (json.data?.path) setPhotoPath(json.data.path);
        router.refresh();
      } catch {
        setPhotoError("Network error");
      }
    });
  }

  function removePhoto() {
    setPhotoError(null);
    if (!confirm("Remove your profile photo?")) return;
    startPhotoTransition(async () => {
      const res = await fetch("/api/doctor/profile/photo", {
        method: "DELETE",
      });
      const json = (await res.json()) as { ok?: boolean; message?: string };
      if (!res.ok || !json.ok) {
        setPhotoError(json.message ?? "Could not remove");
        return;
      }
      setPhotoPath(null);
      router.refresh();
    });
  }

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
            Profile photo
          </h3>
          <p className="mt-1 text-[13px] text-[var(--color-text-muted)]">
            JPEG / PNG / WebP / AVIF, up to 5MB.
          </p>
          <div className="mt-3 flex flex-col items-center gap-3">
            <div
              className="flex h-32 w-32 items-center justify-center overflow-hidden rounded-full"
              style={{
                background: "var(--color-background-soft)",
                border: "1px solid var(--color-border)",
              }}
            >
              {photoPath ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={photoPath}
                  alt="Profile"
                  style={{ height: "100%", width: "100%", objectFit: "cover" }}
                />
              ) : (
                <span
                  className="text-[28px] font-bold"
                  style={{
                    background: "linear-gradient(135deg, #1b4d3e 0%, #b0f122 100%)",
                    WebkitBackgroundClip: "text",
                    backgroundClip: "text",
                    color: "transparent",
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
            <div className="flex w-full flex-col gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={photoPending}
                className="gh-btn gh-btn-primary w-full"
              >
                <Upload className="size-3.5" />
                {photoPending
                  ? "Uploading…"
                  : photoPath
                    ? "Replace photo"
                    : "Upload photo"}
              </button>
              {photoPath ? (
                <button
                  type="button"
                  onClick={removePhoto}
                  disabled={photoPending}
                  className="gh-btn gh-btn-soft w-full"
                >
                  <Trash2 className="size-3.5" /> Remove
                </button>
              ) : null}
            </div>
            {photoError ? (
              <p className="gh-status-warning rounded-md border px-3 py-2 text-[12.5px]">
                {photoError}
              </p>
            ) : null}
          </div>
        </section>

        <section className="gh-card p-6">
          <h3
            className="m-0 text-[var(--color-text-primary)]"
            style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 800 }}
          >
            Admin-managed
          </h3>
          <p className="mt-1 text-[13px] text-[var(--color-text-muted)]">
            Country, URL slug, IMC registration, and your eligible
            specialties stay admin-managed to keep verification +
            routing consistent. Ping support if any of those need to
            change.
          </p>
        </section>
      </aside>
    </form>
  );
}
