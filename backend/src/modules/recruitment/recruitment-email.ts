import { env } from "../../config/env.js";
import { prisma } from "../../db/prisma.js";
import { absoluteSiteUrl, sendEmail } from "../../lib/email/send-email.js";

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]!);
}

/** Dispatches a PII-minimal staff alert. The durable outbox payload contains only the opaque id. */
export async function sendRecruitmentApplicationNotification(applicationId: string): Promise<void> {
  const application = await prisma.jobApplication.findUnique({
    where: { id: applicationId },
    select: {
      submittedAt: true,
      jobListing: { select: { title: true, country: { select: { name: true } } } },
    },
  });
  // A legal/manual purge may win a race with a delayed outbox row. Nothing remains to notify about.
  if (!application) return;

  const title = application.jobListing.title;
  const country = application.jobListing.country.name;
  const url = absoluteSiteUrl(`/admin/careers/applications/${encodeURIComponent(applicationId)}`);
  const subject = `New job application — ${title} — ${country}`;
  const text = [
    "A new job application was received.",
    `Job: ${title}`,
    `Country: ${country}`,
    `Received: ${application.submittedAt.toISOString()}`,
    `Review securely in the admin portal: ${url}`,
    "The CV is available only inside the authenticated portal.",
  ].join("\n");
  const result = await sendEmail({
    to: env.RECRUITMENT_NOTIFICATION_EMAIL,
    subject,
    text,
    html: `<p>A new job application was received.</p><ul><li><strong>Job:</strong> ${escapeHtml(title)}</li><li><strong>Country:</strong> ${escapeHtml(country)}</li><li><strong>Received:</strong> ${escapeHtml(application.submittedAt.toISOString())}</li></ul><p><a href="${escapeHtml(url)}">Review securely in the admin portal</a></p><p>The CV is available only inside the authenticated portal.</p>`,
  });
  if (!result.ok || (env.NODE_ENV === "production" && result.mode === "log")) {
    throw new Error("Recruitment notification delivery failed");
  }
}
