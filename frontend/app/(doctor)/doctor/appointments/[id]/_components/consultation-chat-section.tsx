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
      <ConsultationChat
        appointmentId={appointmentId}
        variant="embedded"
        viewerRole="DOCTOR"
        fetcher={fetchDoctorChat}
        poster={postDoctorMessage}
        fileUploader={uploadDoctorChatFile}
        onToggleLock={(open) => toggleDoctorChatLock(appointmentId, open)}
      />
    </section>
  );
}
