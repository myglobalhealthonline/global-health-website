import "dotenv/config";

/**
 * One-off: tells a migrated subscription patient that their plan moved to the
 * new platform, hands them their invite link, and warns them about the old
 * platform's automated cancellation email.
 *
 * Sends BOTH an email and a WhatsApp message.
 *
 *   Dry run (default — prints both messages, sends nothing):
 *     node --import tsx scripts/send-patient-migration-notice.ts
 *
 *   Test send (goes to TEST_EMAIL / TEST_PHONE below, never the patient):
 *     node --import tsx scripts/send-patient-migration-notice.ts --send --test
 *
 *   Real send to the patient:
 *     node --import tsx scripts/send-patient-migration-notice.ts --send
 *
 * Flags:
 *   --send            actually deliver (default is dry run)
 *   --test            route to the test inbox/number instead of the patient
 *   --email-only      skip the WhatsApp message
 *   --whatsapp-only   skip the email
 *   --real-token      use the live invite token even in a test send
 *
 * SAFETY: a test send replaces the invite token with a dummy. The real token
 * is single-use — opening the link sets the patient's password and burns the
 * invite, so it must not sit clickable in a staff inbox. Pass --real-token to
 * override that deliberately.
 */

const PATIENT = {
  firstName: "Gustavo",
  email: "gustavopierre@gmail.com",
  // Verified against the live record; WhatsApp consent is true on all of this
  // patient's appointments.
  phone: "+353830923728",
  countryCode: "ie",
  inviteToken: "6dhyXK_NJVgkQFfehn8mY_zDfmA6FdJtixbFWK8lE5k",
};

const TEST_EMAIL = "naumanarif432@gmail.com";
const TEST_PHONE = "+923008400763";

const PLACEHOLDER_TOKEN = "TEST-TOKEN-NOT-A-REAL-INVITE";
const LOGIN_URL = "https://www.myglobalhealth.online/login";

const SUBJECT =
  "Welcome to your new Global Health portal — your Essential Care Plan has moved across";

function inviteUrl(token: string): string {
  return `https://www.myglobalhealth.online/reset-password?token=${token}&invite=1`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function heading(text: string): string {
  return `<p style="margin:28px 0 12px;font-family:'Cascadia Code',Consolas,Menlo,monospace;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:#15382A;font-weight:700;">${escapeHtml(text)}</p>`;
}

function buildEmailHtml(link: string): string {
  return `<p style="margin:0 0 16px;">Dear ${escapeHtml(PATIENT.firstName)},</p>
       <p style="margin:0 0 16px;">We've moved Global Health onto a new platform, and your Essential Care Plan has come with you. Nothing about your membership has changed — same plan, same &euro;20 per month, same billing date on the 26th. Your full payment history since September 2025 has been carried over, so all eleven of your payments are recorded and visible to you.</p>

       ${heading("Your new portal")}
       <p style="margin:0 0 16px;">You can now manage everything in one place.</p>
       <p style="margin:0 0 16px;">Your sign-in email is: <strong>${escapeHtml(PATIENT.email)}</strong></p>
       <p style="margin:0 0 16px;">Please use the link below to choose your password:</p>
       <p style="margin:0 0 20px;text-align:center;"><a href="${escapeHtml(link)}" style="background:#B0F122;color:#0a1f14;padding:13px 24px;border-radius:999px;text-decoration:none;font-weight:700;display:inline-block;">Choose my password</a></p>
       <p style="margin:0 0 16px;font-size:13px;color:#737373;word-break:break-all;"><a href="${escapeHtml(link)}" style="color:#737373;">${escapeHtml(link)}</a></p>
       <p style="margin:0 0 16px;padding:14px 16px;background-color:#F6F8F1;border-left:3px solid #B0F122;border-radius:0 10px 10px 0;font-size:14px;">This link is personal to you, so please don't forward it. It stays valid for seven days — if it expires before you get to it, just let us know and we'll send a fresh one.</p>
       <p style="margin:0 0 16px;">After that, you can sign in any time at <a href="${LOGIN_URL}" style="color:#15382A;font-weight:600;">${LOGIN_URL}</a> using the email address above and the password you've chosen.</p>
       <p style="margin:0 0 16px;">Once you're in, you'll be able to view your plan and renewal date, see your consultation credit for the month, book appointments, and review every payment you've made.</p>

       ${heading("One small step for your next payment")}
       <p style="margin:0 0 16px;">For security reasons, card details cannot be transferred between platforms, so we'll need you to enter yours once on our new system. We'll email you a secure payment link on <strong>23 August</strong>. It takes a minute, and you won't be charged anything at that moment.</p>
       <p style="margin:0 0 16px;">Your usual &euro;20 payment will then be taken on <strong>26 August</strong>, exactly as before, and every payment after that will be automatic. You won't need to do this again.</p>

       ${heading("If you receive a cancellation notice")}
       <p style="margin:0 0 16px;">You may receive an automated email from our previous system saying your plan has been cancelled. Please disregard it — it simply reflects the old platform being switched off. Your membership is continuing without interruption, and you won't lose any benefits, history, or time on your plan.</p>
       <p style="margin:0 0 24px;">If anything is unclear or you'd prefer we walk you through it, please just reply to this email — we're happy to help.</p>

       <p style="margin:0;">Warm regards,<br/>The Global Health Team</p>`;
}

function buildEmailText(link: string): string {
  return `Dear ${PATIENT.firstName},

We've moved Global Health onto a new platform, and your Essential Care Plan has come with you. Nothing about your membership has changed — same plan, same EUR 20 per month, same billing date on the 26th. Your full payment history since September 2025 has been carried over, so all eleven of your payments are recorded and visible to you.

YOUR NEW PORTAL

You can now manage everything in one place.

Your sign-in email is: ${PATIENT.email}

Please use the link below to choose your password:

${link}

This link is personal to you, so please don't forward it. It stays valid for seven days — if it expires before you get to it, just let us know and we'll send a fresh one.

After that, you can sign in any time at ${LOGIN_URL} using the email address above and the password you've chosen.

Once you're in, you'll be able to view your plan and renewal date, see your consultation credit for the month, book appointments, and review every payment you've made.

ONE SMALL STEP FOR YOUR NEXT PAYMENT

For security reasons, card details cannot be transferred between platforms, so we'll need you to enter yours once on our new system. We'll email you a secure payment link on 23 August. It takes a minute, and you won't be charged anything at that moment.

Your usual EUR 20 payment will then be taken on 26 August, exactly as before, and every payment after that will be automatic. You won't need to do this again.

IF YOU RECEIVE A CANCELLATION NOTICE

You may receive an automated email from our previous system saying your plan has been cancelled. Please disregard it — it simply reflects the old platform being switched off. Your membership is continuing without interruption, and you won't lose any benefits, history, or time on your plan.

If anything is unclear or you'd prefer we walk you through it, please just reply to this email — we're happy to help.

Warm regards,
The Global Health Team`;
}

function buildWhatsAppMessage(link: string): string {
  return `Hi ${PATIENT.firstName},

We've moved Global Health onto a new platform, and your Essential Care Plan has come with you. Nothing has changed — same plan, same EUR 20 per month, same billing date on the 26th. All eleven of your payments since September 2025 have been carried over.

To set your password and open your new portal:
${link}

This link is personal to you, so please don't forward it. It stays valid for seven days.

One small step: card details can't be transferred between platforms, so we'll email you a secure payment link on 23 August to enter yours once. You won't be charged at that moment — your usual EUR 20 will be taken on 26 August exactly as before, and automatically from then on.

You may also receive an automated cancellation email from our previous system. Please disregard it — it only reflects the old platform being switched off. Your membership continues without interruption.

If anything is unclear, just reply here and we'll help.

— The Global Health Team`;
}

async function main() {
  const argv = process.argv.slice(2);
  const doSend = argv.includes("--send");
  const isTest = argv.includes("--test");
  const emailOnly = argv.includes("--email-only");
  const whatsappOnly = argv.includes("--whatsapp-only");
  const realToken = argv.includes("--real-token");

  const { sendEmail, isEmailConfigured } = await import("../src/lib/email/send-email.js");
  const { wrapHtml } = await import("../src/lib/email/templates.js");
  const { sendWhatsAppText, isWhatsAppConfigured } = await import(
    "../src/lib/whatsapp/wasender.js"
  );

  // A test send must not carry a live single-use invite: opening it would set
  // the patient's password and consume the token.
  const useRealToken = !isTest || realToken;
  const link = inviteUrl(useRealToken ? PATIENT.inviteToken : PLACEHOLDER_TOKEN);

  const toEmail = isTest ? TEST_EMAIL : PATIENT.email;
  const toPhone = isTest ? TEST_PHONE : PATIENT.phone;

  console.log("");
  console.log("  Global Health — patient migration notice");
  console.log("  ------------------------------------------------------------");
  console.log(`  mode          : ${doSend ? "SEND (live)" : "DRY RUN (nothing sent)"}`);
  console.log(`  audience      : ${isTest ? "TEST — patient will NOT be contacted" : "THE PATIENT"}`);
  console.log(`  email to      : ${toEmail}`);
  console.log(`  whatsapp to   : ${toPhone}`);
  console.log(`  invite token  : ${useRealToken ? "LIVE (single use — do not click)" : "placeholder (safe)"}`);
  console.log(`  email transport   : ${isEmailConfigured() ? "configured" : "NOT CONFIGURED"}`);
  console.log(`  whatsapp transport: ${isWhatsAppConfigured() ? "configured" : "NOT CONFIGURED"}`);
  console.log("");

  if (!doSend) {
    if (!whatsappOnly) {
      console.log("  ---------- EMAIL ----------");
      console.log(`  Subject: ${SUBJECT}\n`);
      console.log(buildEmailText(link));
    }
    if (!emailOnly) {
      console.log("\n  ---------- WHATSAPP ----------\n");
      console.log(buildWhatsAppMessage(link));
    }
    console.log("\n  dry run complete — add --send to deliver.\n");
    return;
  }

  if (!whatsappOnly) {
    const result = await sendEmail({
      to: toEmail,
      subject: SUBJECT,
      html: wrapHtml("Your Essential Care Plan has moved", buildEmailHtml(link)),
      text: buildEmailText(link),
    });
    console.log(
      result.ok
        ? `  email     sent → ${toEmail}  mode=${(result as { mode: string }).mode}`
        : `  email     FAILED → ${toEmail}  ${(result as { message: string }).message}`,
    );
  }

  if (!emailOnly) {
    const result = await sendWhatsAppText({
      to: toPhone,
      message: buildWhatsAppMessage(link),
      hints: { orderCountryCode: isTest ? null : PATIENT.countryCode },
      // Consent gate applies to the patient only. The test number is a staff
      // handset, so the key is omitted there (documented opt-out).
      ...(isTest ? {} : { patientConsent: true }),
    });
    console.log(
      result.ok
        ? `  whatsapp  ${result.skipped ? "SKIPPED" : "sent"} → ${toPhone}${result.skipped ? `  (${result.message ?? "skipped"})` : ""}`
        : `  whatsapp  FAILED → ${toPhone}  ${result.message ?? "unknown error"}`,
    );
  }

  console.log("");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
