"use client";

import { useCallback, useEffect, useState } from "react";
import { BadgeCheck, ChevronDown, ShieldAlert, ShieldQuestion } from "lucide-react";
import {
  fetchIdentityVerification,
  identityImageUrl,
  requestIdentityVerification,
  reviewIdentityVerification,
  type DoctorIdentityVerification,
} from "@/lib/api/doctor-identity-verification-client";

/**
 * Patient identity status during an Irish consultation, with the ID photo and
 * selfie side by side so the doctor can make the call the law asks them to.
 *
 * Ireland only — the caller gates on country. The images load only when the
 * doctor expands the comparison, so opening a consultation does not pull a
 * patient's biometric images (and does not write an access-log row) unless
 * someone actually looked.
 */

type Msg = { kind: "ok" | "err"; text: string } | null;

function StatusPill({ data }: { data: DoctorIdentityVerification }) {
  // verifiedForPrescription, not status — see the type's comment. A patient
  // whose ID document an admin accepted still needs a face check here.
  if (data.verifiedForPrescription) {
    return (
      <span className="gh-badge gh-badge-success inline-flex items-center gap-1">
        <BadgeCheck className="size-3.5" aria-hidden />
        Verified
      </span>
    );
  }
  if (data.status === "PENDING") {
    return <span className="gh-badge gh-badge-warning">Awaiting review</span>;
  }
  if (data.status === "REJECTED") {
    return <span className="gh-badge gh-badge-error">Rejected</span>;
  }
  return <span className="gh-badge gh-badge-neutral">Not verified</span>;
}

export function IdentityVerificationCard({
  email,
  /**
   * "rail" — compact, collapsed, for the patient sidebar.
   * "panel" — the dedicated Identity tab: larger photos, open by default,
   *   because the doctor navigated there specifically to review.
   */
  variant = "rail",
}: {
  email: string;
  variant?: "rail" | "panel";
}) {
  const isPanel = variant === "panel";
  const [data, setData] = useState<DoctorIdentityVerification | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [open, setOpen] = useState(variant === "panel");
  const [busy, setBusy] = useState(false);
  const [notes, setNotes] = useState("");
  const [msg, setMsg] = useState<Msg>(null);

  const load = useCallback(async () => {
    const res = await fetchIdentityVerification(email);
    if (res.ok) setData(res.data.identityVerification);
    setLoaded(true);
  }, [email]);

  // Inlined rather than calling `load()` so the state updates sit in a promise
  // continuation the lint rule can see is not synchronous. `load` is still
  // used to refresh after a request/review.
  useEffect(() => {
    void fetchIdentityVerification(email).then((res) => {
      if (res.ok) setData(res.data.identityVerification);
      setLoaded(true);
    });
  }, [email]);

  async function onRequest() {
    setBusy(true);
    setMsg(null);
    const res = await requestIdentityVerification(email);
    setBusy(false);
    if (res.ok) {
      setMsg({
        kind: res.data.sent.length > 0 ? "ok" : "err",
        text:
          res.data.sent.length > 0
            ? `Verification requested — sent by ${res.data.sent.join(" and ")}.`
            : "Request recorded, but no message could be delivered. The patient will still see it in their portal.",
      });
      await load();
    } else {
      setMsg({ kind: "err", text: res.message });
    }
  }

  async function onReview(status: "VERIFIED" | "REJECTED") {
    const eventId = data?.latestEvent?.id;
    if (!eventId) return;
    setBusy(true);
    setMsg(null);
    const res = await reviewIdentityVerification(email, {
      eventId,
      status,
      reviewNotes: notes.trim() || null,
    });
    setBusy(false);
    if (res.ok) {
      setNotes("");
      setMsg({ kind: "ok", text: res.message ?? "Review recorded" });
      await load();
    } else {
      setMsg({ kind: "err", text: res.message });
    }
  }

  if (!loaded || !data) return null;

  const event = data.latestEvent;
  const canCompare = data.hasIdDocument && data.hasSelfie;

  return (
    <div
      className={`rounded-md border border-[var(--portal-line)] bg-[var(--portal-well)] ${
        isPanel ? "p-4" : "mt-4 p-3"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-portal-thead font-bold uppercase tracking-[0.12em] text-[var(--portal-muted)]">
            Patient identity
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <StatusPill data={data} />
            {data.verifiedForPrescription && data.verifiedAt && (
              <span className="text-portal-meta text-[var(--portal-muted)]">
                {new Date(data.verifiedAt).toLocaleString()}
              </span>
            )}
          </div>
          {data.verifiedForPrescription && event?.referenceId && (
            <p className="mt-1 font-mono text-portal-meta text-[var(--portal-muted)]">
              {event.referenceId}
            </p>
          )}
        </div>
        {/* The panel is the Identity tab itself — the doctor navigated there to
            review, so there is nothing to expand. */}
        {canCompare && !isPanel && (
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            className="gh-btn gh-btn-soft inline-flex shrink-0 items-center gap-1 text-sm"
          >
            {open ? "Hide" : "Compare"}
            <ChevronDown
              aria-hidden
              className={`size-3.5 transition-transform ${open ? "rotate-180" : ""}`}
            />
          </button>
        )}
      </div>

      {/* Warning, not a block: the doctor may still prescribe. The prescription
          simply carries no identity claim. */}
      {!data.verifiedForPrescription && (
        <p className="mt-2 flex items-start gap-2 rounded-md bg-amber-50 px-3 py-2 text-portal-compact text-amber-900">
          <ShieldAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>
            Identity not verified. You can still prescribe — the prescription will carry no
            &ldquo;Patient Identity Verified&rdquo; marking.
          </span>
        </p>
      )}

      {/* The patient can supply these in either order, so say which half is
          outstanding rather than assuming the ID comes first. */}
      {!data.hasIdDocument && !data.hasSelfie && (
        <p className="mt-2 text-portal-meta text-[var(--portal-muted)]">
          No ID document or verification photo on file.
        </p>
      )}
      {data.hasIdDocument && !data.hasSelfie && (
        <p className="mt-2 text-portal-meta text-[var(--portal-muted)]">
          ID on file — waiting on the patient&rsquo;s verification photo.
        </p>
      )}
      {!data.hasIdDocument && data.hasSelfie && (
        <p className="mt-2 text-portal-meta text-[var(--portal-muted)]">
          Verification photo on file — waiting on the patient&rsquo;s ID document.
        </p>
      )}

      {open && canCompare && (
        <div className="mt-3 space-y-3">
          <div className="grid gap-2 sm:grid-cols-2">
            <figure className="m-0">
              <figcaption className="mb-1 flex flex-wrap items-baseline justify-between gap-2 text-portal-meta text-[var(--portal-muted)]">
                <span>ID document</span>
                {/* Always offered, for both formats: a passport scan can be
                    denser than the inline box, and the doctor is being asked
                    to match a face against it. */}
                <a
                  href={identityImageUrl(email, "id")}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-[var(--portal-text)]"
                >
                  Open full size
                </a>
              </figcaption>
              {/* Scanned passports are frequently PDFs, which an <img> cannot
                  render — that showed the doctor a broken image with no clue
                  why. Embed those instead, keeping the link above as the
                  fallback if the browser declines to render inline. */}
              {data.idDocumentIsPdf ? (
                // iframe, not <object>: the site CSP sets `object-src 'none'`
                // (proxy.ts CSP_BASE), which would block an <object> silently,
                // while `frame-src 'self'` permits this same-origin embed.
                <iframe
                  src={identityImageUrl(email, "id")}
                  title="Patient's government ID document (PDF)"
                  className={`w-full rounded border border-[var(--portal-line)] bg-white ${
                    isPanel ? "h-96" : "h-56"
                  }`}
                />
              ) : (
                /* eslint-disable-next-line @next/next/no-img-element -- authenticated, no-store, access-logged stream from the backend; next/image would need a public URL and would cache what must not be cached. */
                <img
                  src={identityImageUrl(email, "id")}
                  alt="Patient's government ID document"
                  className={`w-full rounded border border-[var(--portal-line)] object-contain ${
                    isPanel ? "max-h-96" : "max-h-56"
                  }`}
                />
              )}
            </figure>
            <figure className="m-0">
              <figcaption className="mb-1 flex flex-wrap items-baseline justify-between gap-2 text-portal-meta text-[var(--portal-muted)]">
                <span>
                  Verification photo
                  {data.selfieUploadedAt &&
                    ` · ${new Date(data.selfieUploadedAt).toLocaleDateString()}`}
                </span>
                <a
                  href={identityImageUrl(email, "selfie")}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-[var(--portal-text)]"
                >
                  Open full size
                </a>
              </figcaption>
              {/* eslint-disable-next-line @next/next/no-img-element -- see above. */}
              <img
                src={identityImageUrl(email, "selfie")}
                alt="Patient's verification photo"
                className={`w-full rounded border border-[var(--portal-line)] object-contain ${
                  isPanel ? "max-h-96" : "max-h-56"
                }`}
              />
            </figure>
          </div>

          {/* The score is shown as an aid and labelled as one. The decision
              below is the doctor's, and it is their name on the audit row. */}
          <p className="flex items-start gap-2 text-portal-meta text-[var(--portal-muted)]">
            <ShieldQuestion className="mt-0.5 size-3.5 shrink-0" aria-hidden />
            {event?.faceMatchScore != null ? (
              <span>
                Automated face match:{" "}
                <strong className="text-[var(--portal-text)]">
                  {event.faceMatchScore.toFixed(1)}% similarity
                </strong>
                . A guide only — your confirmation is what verifies this patient.
              </span>
            ) : (
              <span>
                No automated match available
                {data.automatedCheckAvailable
                  ? " for these images"
                  : " (automated checking is not enabled)"}
                . Compare the photos yourself.
              </span>
            )}
          </p>

          {data.awaitingReview && event && (
            <div className="space-y-2">
              <label className="block">
                <span className="text-portal-meta text-[var(--portal-muted)]">
                  Notes (optional — shown to the patient if you reject)
                </span>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  maxLength={1000}
                  className="gh-input mt-1 w-full"
                />
              </label>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void onReview("VERIFIED")}
                  className="gh-btn gh-btn-primary text-sm"
                >
                  {busy ? "Saving…" : "Confirm identity"}
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void onReview("REJECTED")}
                  className="gh-btn gh-btn-soft text-sm"
                >
                  Reject
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {!data.verifiedForPrescription && !data.awaitingReview && (
        <div className="mt-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => void onRequest()}
            className="gh-btn gh-btn-soft text-sm"
          >
            {busy
              ? "Sending…"
              : data.requestedAt
                ? "Request again"
                : "Request verification"}
          </button>
          {data.requestedAt && (
            <p className="mt-1 text-portal-meta text-[var(--portal-muted)]">
              Requested {new Date(data.requestedAt).toLocaleString()}
            </p>
          )}
        </div>
      )}

      {msg && (
        <p
          role={msg.kind === "ok" ? "status" : "alert"}
          className={`mt-2 rounded-md px-3 py-2 text-portal-compact ${
            msg.kind === "ok" ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-800"
          }`}
        >
          {msg.text}
        </p>
      )}
    </div>
  );
}
