/** Switch appointment workspace to Documents tab and expand Review & send. */
export const DOCTOR_FOCUS_REVIEW_SEND_EVENT = "gh:doctor:focus-review-send";

export function focusDoctorReviewSend() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(DOCTOR_FOCUS_REVIEW_SEND_EVENT));
}

/** Open a generated PDF in a separate browser tab (avoids popup blockers after async fetch). */
export function openDoctorPdfInNewTab(pdfUrl: string) {
  if (typeof window === "undefined") return;
  const url = pdfUrl.startsWith("http")
    ? pdfUrl
    : `${window.location.origin}${pdfUrl.startsWith("/") ? pdfUrl : `/${pdfUrl}`}`;

  const popup = window.open(url, "_blank", "noopener,noreferrer");
  if (popup) return;

  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.target = "_blank";
  anchor.rel = "noopener noreferrer";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
}
