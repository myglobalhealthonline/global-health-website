"use client";

import { OrderMeetLinkActions } from "../../_components/order-meet-link-actions";

type Props = {
  orderId: string;
  meetingUrl: string | null;
  hasConsultation: boolean;
};

export function OrderMeetLinkPanel({ orderId, meetingUrl, hasConsultation }: Props) {
  return (
    <OrderMeetLinkActions
      orderId={orderId}
      meetingUrl={meetingUrl}
      hasConsultation={hasConsultation}
      variant="panel"
    />
  );
}
