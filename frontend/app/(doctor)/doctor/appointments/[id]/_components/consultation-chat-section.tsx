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
  labels?: Record<string, string>;
};

export function DoctorConsultationChatSection({ appointmentId, labels }: Props) {
  return (
    <section className="space-y-3">
      <ConsultationChat
        appointmentId={appointmentId}
        variant="embedded"
        viewerRole="DOCTOR"
        fetcher={fetchDoctorChat}
        poster={postDoctorMessage}
        fileUploader={uploadDoctorChatFile}
        onToggleLock={(open) => toggleDoctorChatLock(appointmentId, open)}
        labels={labels}
      />
    </section>
  );
}
