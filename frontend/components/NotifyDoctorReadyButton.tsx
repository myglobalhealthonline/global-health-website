"use client";

import { useState, useTransition } from "react";
import { BellRing } from "lucide-react";
import { Btn, type BtnSize } from "@/components/portal-atoms";

export type NotifyDoctorReadyCopy = {
  button: string;
  sending: string;
  sent: string;
  partial: string;
  failed: string;
};

type NotifyResponse = {
  ok?: boolean;
  message?: string;
  data?: {
    sent?: string[];
    failed?: string[];
    missingPhone?: boolean;
    missingConsent?: boolean;
  };
};

type Status = "idle" | "sent" | "partial" | "failed";

/**
 * One-click "doctor is ready" notification — emails + WhatsApps the patient
 * the join link. Always both channels (no per-channel choice, unlike
 * SendPatientUploadLinkCard) since the point is "come in now", not picking a
 * delivery method. Result collapses into the button label for a few seconds
 * so it fits a table row / action slot without extra layout.
 */
export function NotifyDoctorReadyButton({
  appointmentId,
  copy,
  size = "sm",
  className,
  disabled = false,
}: {
  appointmentId: string;
  copy: NotifyDoctorReadyCopy;
  size?: BtnSize;
  className?: string;
  /** True once the consultation's time window has passed — "doctor is
   *  ready" no longer makes sense for a slot that's already over. */
  disabled?: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useState<Status>("idle");

  function send() {
    startTransition(async () => {
      try {
        const res = await fetch(`/api/doctor/appointments/${appointmentId}/notify-ready`, {
          method: "POST",
          headers: { "content-type": "application/json" },
        });
        const json = (await res.json().catch(() => ({}))) as NotifyResponse;
        if (!res.ok || !json.ok) {
          setStatus("failed");
        } else {
          const sent = json.data?.sent ?? [];
          const failed = json.data?.failed ?? [];
          setStatus(sent.length === 0 ? "failed" : failed.length > 0 ? "partial" : "sent");
        }
      } catch {
        setStatus("failed");
      }
      setTimeout(() => setStatus("idle"), 5000);
    });
  }

  const label = pending
    ? copy.sending
    : status === "sent"
      ? copy.sent
      : status === "partial"
        ? copy.partial
        : status === "failed"
          ? copy.failed
          : copy.button;

  return (
    <Btn
      type="button"
      variant={status === "failed" ? "danger" : "soft"}
      size={size}
      loading={pending}
      success={status === "sent"}
      disabled={pending || disabled}
      onClick={send}
      title={copy.button}
      iconLeft={<BellRing className="size-3.5" aria-hidden />}
      className={className}
    >
      {label}
    </Btn>
  );
}
