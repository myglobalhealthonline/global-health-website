"use client";

import { ConsultationChat } from "@/components/chat/ConsultationChat";
import {
  fetchDoctorChat,
  postDoctorMessage,
  uploadDoctorChatFile,
  toggleDoctorChatLock,
} from "@/lib/api/consultation-chat-api";

type Props = {
  appointmentId: string;
};

export function DoctorConsultationChatSection({ appointmentId }: Props) {
  return (
    <section className="space-y-3">
      <div className="rounded-lg border border-[var(--color-border)] bg-white/80 p-3 shadow-sm">
        <p className="text-sm font-bold text-[var(--color-text-primary)]">
          Consultation messaging
        </p>
        <p className="mt-1 text-[12px] text-[var(--color-text-muted)]">
          Share appointment-specific instructions, files, and follow-up context with the patient.
        </p>
      </div>
      <ConsultationChat
        appointmentId={appointmentId}
        viewerRole="DOCTOR"
        fetcher={fetchDoctorChat}
        poster={postDoctorMessage}
        fileUploader={uploadDoctorChatFile}
        onToggleLock={(open) => toggleDoctorChatLock(appointmentId, open)}
      />
    </section>
  );
}
