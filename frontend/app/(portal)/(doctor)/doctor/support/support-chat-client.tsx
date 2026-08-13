"use client";

import { SupportChat, type SupportChatLabels } from "@/components/chat/SupportChat";
import {
  fetchDoctorSupportThread,
  postDoctorSupportMessage,
  uploadDoctorSupportFile,
  type SupportMessage,
} from "@/lib/api/support-chat-api";

/**
 * Binds the doctor-side fetchers to the shared `SupportChat`. Thin on purpose —
 * all chat behaviour lives in the component, all copy comes from the server
 * page's locale bundle.
 */
export function DoctorSupportChat({
  initialItems,
  labels,
}: {
  initialItems: SupportMessage[];
  labels?: SupportChatLabels;
}) {
  return (
    <SupportChat
      viewerSide="DOCTOR"
      initialItems={initialItems}
      fetcher={fetchDoctorSupportThread}
      poster={postDoctorSupportMessage}
      fileUploader={uploadDoctorSupportFile}
      labels={labels}
    />
  );
}
