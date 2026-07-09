"use client";

import { ConsultationChat } from "@/components/chat/ConsultationChat";
import {
  fetchDoctorChat,
  postDoctorMessage,
  uploadDoctorChatFile,
  toggleDoctorChatLock,
} from "@/lib/api/consultation-chat-api";

export type ConsultationChatCopy = {
  title: string;
  description: string;
};

type Props = {
  appointmentId: string;
  copy: ConsultationChatCopy;
};

export function DoctorConsultationChatSection({ appointmentId, copy }: Props) {
  return (
    <section className="space-y-3">
      <div className="rounded-lg border border-[var(--portal-line)] bg-white/80 p-3 shadow-sm">
        <p className="text-sm font-bold text-[var(--portal-text)]">
          {copy.title}
        </p>
        <p className="mt-1 text-[12px] text-[var(--portal-muted)]">
          {copy.description}
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
