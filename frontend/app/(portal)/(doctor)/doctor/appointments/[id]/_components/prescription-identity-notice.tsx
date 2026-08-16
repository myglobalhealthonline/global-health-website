"use client";

import { useEffect, useState } from "react";
import { BadgeCheck, ShieldAlert } from "lucide-react";
import {
  fetchIdentityVerification,
  type DoctorIdentityVerification,
} from "@/lib/api/doctor-identity-verification-client";

/**
 * Tells the doctor, at the moment they are filling in a medicine prescription,
 * what the document is about to claim about this patient's identity.
 *
 * Informational, never blocking — issuing is always allowed. The warning
 * exists so an unverified patient is a decision the doctor made rather than a
 * detail they discovered afterwards on the PDF.
 *
 * Ireland only; the caller gates on country.
 */
export function PrescriptionIdentityNotice({ email }: { email: string }) {
  const [data, setData] = useState<DoctorIdentityVerification | null>(null);

  useEffect(() => {
    void fetchIdentityVerification(email).then((res) => {
      if (res.ok) setData(res.data.identityVerification);
    });
  }, [email]);

  if (!data) return null;

  // Keyed off verifiedForPrescription, not status: an admin can mark the ID
  // document VERIFIED without anyone comparing a face, and that cannot back a
  // controlled-medication claim. This is the same rule the PDF applies.
  if (data.verifiedForPrescription) {
    return (
      <p className="flex items-start gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-900">
        <BadgeCheck className="mt-0.5 size-4 shrink-0" aria-hidden />
        <span>
          Patient identity verified
          {data.verifiedAt ? ` on ${new Date(data.verifiedAt).toLocaleDateString()}` : ""}. This
          prescription will carry the verification marking and reference.
        </span>
      </p>
    );
  }

  return (
    <p className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
      <ShieldAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
      <span>
        {data.awaitingReview
          ? "This patient has submitted a verification photo but nobody has confirmed it yet. Review it in the patient panel — otherwise this prescription will carry no identity verification."
          : "This patient's identity has not been verified. You can still issue the prescription; it will simply carry no identity verification. Request verification from the patient panel."}
      </span>
    </p>
  );
}
