"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, CheckCircle2, Clock, ShieldAlert, X } from "lucide-react";
import {
  fetchIdentityVerification,
  uploadVerificationSelfie,
  type IdentityVerificationData,
} from "@/lib/api/account-profile-api";

/**
 * Ireland controlled-medication identity check: take a live photo of your face
 * so a clinician can match it against the ID document already on file.
 *
 * Renders nothing unless the server says the patient is in scope — country
 * rules live on the backend, not here.
 */

const JPEG_QUALITY = 0.92;
/** Enough for a face match; larger buys nothing and costs the patient upload time. */
const CAPTURE_WIDTH = 960;

type CameraState = "idle" | "starting" | "live" | "denied" | "unsupported";

function StatusRow({ data }: { data: IdentityVerificationData }) {
  const map = {
    VERIFIED: {
      icon: <CheckCircle2 className="size-5 text-emerald-600" aria-hidden />,
      title: "Identity verified",
      cls: "bg-emerald-50 text-emerald-900",
      detail: data.verifiedAt
        ? `Verified on ${new Date(data.verifiedAt).toLocaleDateString()}`
        : null,
    },
    PENDING: {
      icon: <Clock className="size-5 text-amber-600" aria-hidden />,
      title: "Awaiting review",
      cls: "bg-amber-50 text-amber-900",
      detail: "Your doctor will confirm this before your consultation.",
    },
    REJECTED: {
      icon: <ShieldAlert className="size-5 text-rose-600" aria-hidden />,
      title: "Not accepted",
      cls: "bg-rose-50 text-rose-900",
      detail: data.reviewNotes ?? "Please take a new photo in better lighting.",
    },
    NOT_VERIFIED: {
      icon: <ShieldAlert className="size-5 text-[var(--portal-muted)]" aria-hidden />,
      title: "Not verified yet",
      cls: "bg-[var(--portal-well)] text-[var(--portal-text)]",
      detail: null,
    },
  }[data.status];

  return (
    <div className={`flex items-start gap-3 rounded-lg px-4 py-3 ${map.cls}`}>
      {map.icon}
      <div className="min-w-0">
        <p className="text-sm font-semibold">{map.title}</p>
        {map.detail && <p className="mt-0.5 text-xs opacity-90">{map.detail}</p>}
        {data.referenceId && data.status === "VERIFIED" && (
          <p className="mt-0.5 font-mono text-xs opacity-75">{data.referenceId}</p>
        )}
      </div>
    </div>
  );
}

export function IdentityVerificationCard({
  /** Bump to force a re-read — the ID upload lives in the parent tab, and this
   *  card would otherwise keep showing the pre-upload state until a reload. */
  refreshKey = 0,
}: {
  refreshKey?: number;
}) {
  const [data, setData] = useState<IdentityVerificationData | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [camera, setCamera] = useState<CameraState>("idle");
  const [preview, setPreview] = useState<{ url: string; blob: Blob } | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  // Object URLs are revoked on replace/unmount; without this a patient
  // retaking a few photos leaks a blob per attempt.
  const previewUrlRef = useRef<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetchIdentityVerification();
    if (res.ok) setData(res.data.identityVerification);
    setLoaded(true);
  }, []);

  // Inlined rather than calling `load()` so the state updates sit in a promise
  // continuation the lint rule can see is not synchronous — same shape as the
  // sibling verification-tab. `load` is still used to refresh after a submit.
  useEffect(() => {
    void fetchIdentityVerification().then((res) => {
      if (res.ok) setData(res.data.identityVerification);
      setLoaded(true);
    });
  }, [refreshKey]);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCamera("idle");
  }, []);

  // Releasing the camera matters more than usual here: the browser keeps the
  // recording indicator lit until every track stops, and a patient who left
  // this page would reasonably read that as us still watching them.
  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    };
  }, []);

  async function startCamera() {
    if (!navigator.mediaDevices?.getUserMedia) {
      setCamera("unsupported");
      return;
    }
    setCamera("starting");
    setMsg(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 1280 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
      setCamera("live");
    } catch {
      setCamera("denied");
    }
  }

  function setPreviewBlob(blob: Blob) {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    const url = URL.createObjectURL(blob);
    previewUrlRef.current = url;
    setPreview({ url, blob });
  }

  function capture() {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const scale = CAPTURE_WIDTH / video.videoWidth;
    const canvas = document.createElement("canvas");
    canvas.width = CAPTURE_WIDTH;
    canvas.height = Math.round(video.videoHeight * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        setPreviewBlob(blob);
        stopCamera();
      },
      "image/jpeg",
      JPEG_QUALITY,
    );
  }

  function onFilePicked(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setMsg(null);
    setPreviewBlob(file);
  }

  async function submit() {
    if (!preview) return;
    setBusy(true);
    setMsg(null);
    const file = new File([preview.blob], "identity-selfie.jpg", {
      type: preview.blob.type || "image/jpeg",
    });
    const res = await uploadVerificationSelfie(file);
    setBusy(false);
    if (res.ok) {
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
      setPreview(null);
      setMsg({ kind: "ok", text: "Photo submitted. Your doctor will confirm it." });
      await load();
    } else {
      setMsg({ kind: "err", text: res.message });
    }
  }

  function discard() {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    previewUrlRef.current = null;
    setPreview(null);
  }

  if (!loaded || !data?.relevant) return null;

  // The two uploads are independent — a patient can take their photo before
  // they have their passport to hand. The ID is still required overall, so its
  // absence is surfaced as an outstanding step, not as a lock on this one.
  const showCapture = data.status !== "VERIFIED" || preview !== null;

  return (
    <div className="gh-patient-form-card gh-card p-6">
      <header className="mb-4 flex items-start gap-2">
        <Camera className="mt-0.5 size-5 text-[var(--portal-primary)]" aria-hidden />
        <div>
          <h3 className="text-lg font-semibold text-[var(--portal-text)]">Photo ID verification</h3>
          <p className="mt-1 text-sm text-[var(--portal-muted)]">
            Irish rules require us to confirm who you are before certain medications can be
            prescribed. Take a photo of your face and we will match it to the ID document on
            your file.
          </p>
        </div>
      </header>

      {data.requestedAt && data.status !== "VERIFIED" && (
        <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {data.requestedByDoctor
            ? "Your doctor has asked you to complete this before your consultation."
            : "Please complete this before your consultation."}
        </p>
      )}

      <StatusRow data={data} />

      {!data.hasIdDocument && (
        <p className="mt-4 rounded-lg bg-[var(--portal-well)] px-4 py-3 text-sm text-[var(--portal-muted)]">
          {data.hasSelfie
            ? "Photo received. Still needed: upload your government ID above."
            : "You also need to upload your government ID above — you can do that before or after taking your photo."}
        </p>
      )}

      {showCapture && (
        <div className="mt-4 space-y-3">
          {preview ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element -- a blob: object URL from the patient's own camera; next/image cannot optimise it and would need it uploaded first. */}
              <img
                src={preview.url}
                alt="Your verification photo, ready to submit"
                className="max-h-72 w-full rounded-lg object-contain"
              />
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => void submit()}
                  disabled={busy}
                  className="rounded-md bg-[var(--portal-primary)] px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
                >
                  {busy ? "Submitting…" : "Submit for verification"}
                </button>
                <button
                  type="button"
                  onClick={discard}
                  disabled={busy}
                  className="rounded-md border border-[var(--portal-line)] px-4 py-2 text-sm font-medium text-[var(--portal-text)] hover:bg-[var(--portal-well)] disabled:opacity-60"
                >
                  Retake
                </button>
              </div>
            </>
          ) : camera === "live" || camera === "starting" ? (
            <>
              <div className="relative overflow-hidden rounded-lg bg-black">
                <video
                  ref={videoRef}
                  playsInline
                  muted
                  // Mirrored so it behaves like a mirror while the patient
                  // frames themselves. The captured canvas is not mirrored.
                  className="max-h-72 w-full -scale-x-100 object-contain"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={capture}
                  disabled={camera !== "live"}
                  className="rounded-md bg-[var(--portal-primary)] px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
                >
                  {camera === "starting" ? "Starting camera…" : "Take photo"}
                </button>
                <button
                  type="button"
                  onClick={stopCamera}
                  className="inline-flex items-center gap-1.5 rounded-md border border-[var(--portal-line)] px-4 py-2 text-sm font-medium text-[var(--portal-text)] hover:bg-[var(--portal-well)]"
                >
                  <X aria-hidden className="size-4" />
                  Cancel
                </button>
              </div>
            </>
          ) : (
            <div className="space-y-2">
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => void startCamera()}
                  className="inline-flex items-center gap-2 rounded-md bg-[var(--portal-primary)] px-4 py-2 text-sm font-medium text-white"
                >
                  <Camera aria-hidden className="size-4" />
                  {data.hasSelfie ? "Take a new photo" : "Take photo"}
                </button>
                {/* Fallback for a blocked or absent camera, and the normal path
                    on phones, where `capture` opens the front camera directly. */}
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-[var(--portal-line)] px-4 py-2 text-sm font-medium text-[var(--portal-text)] hover:bg-[var(--portal-well)]">
                  Upload a photo instead
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    capture="user"
                    onChange={onFilePicked}
                    className="sr-only"
                  />
                </label>
              </div>
              {camera === "denied" && (
                <p className="text-xs text-[var(--portal-muted)]">
                  We could not open your camera. Check the permission in your browser, or upload
                  a photo instead.
                </p>
              )}
              {camera === "unsupported" && (
                <p className="text-xs text-[var(--portal-muted)]">
                  This browser cannot open a camera here — please upload a photo instead.
                </p>
              )}
            </div>
          )}

          <p className="text-xs text-[var(--portal-muted)]">
            Your photo and ID are stored securely and are only visible to you and the clinicians
            treating you.
          </p>
        </div>
      )}

      {msg && (
        <p
          role={msg.kind === "ok" ? "status" : "alert"}
          className={`mt-4 rounded-md px-3 py-2 text-sm ${
            msg.kind === "ok" ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-800"
          }`}
        >
          {msg.text}
        </p>
      )}
    </div>
  );
}
