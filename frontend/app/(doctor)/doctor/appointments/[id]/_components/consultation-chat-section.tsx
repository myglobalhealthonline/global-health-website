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
    <ConsultationChat
      appointmentId={appointmentId}
      viewerRole="DOCTOR"
      fetcher={fetchDoctorChat}
      poster={postDoctorMessage}
      fileUploader={uploadDoctorChatFile}
      onToggleLock={(open) => toggleDoctorChatLock(appointmentId, open)}
    />
  );
}
