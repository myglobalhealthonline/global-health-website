import { prisma } from "../../db/prisma.js";
import { emitOpsAlert } from "../subscriptions/ops/ops-alert.js";
import {
  expiryWarnThreshold,
  fingerprintSuffix,
  inspectSuklCertificate,
  isSuklConfigured,
  isSuklError,
  suklEnvironment,
  suklWorkplaceCode,
} from "../../lib/sukl/index.js";

/**
 * Daily certificate watch.
 *
 * A SÚKL communication certificate is issued for a fixed term and its silent
 * expiry would take ePoukaz down with no warning. This job refreshes the
 * facility mirror row and raises an ops alert as the certificate crosses 60, 30,
 * 14 and 7 days remaining — once per band, not once per day, tracked by
 * `lastExpiryAlertDays`.
 *
 * Fails OPEN: a validation problem is reported and swallowed. Certificate
 * monitoring must never be able to take down the scheduler.
 *
 * Nothing here logs or alerts with the password, the PFX bytes, the private key,
 * the certificate path, or the full fingerprint — the alert carries the last 8
 * fingerprint characters so an operator can confirm which certificate is meant.
 */

export interface SuklCertificateMonitorResult {
  ran: boolean;
  reason?: "not-configured";
  daysUntilExpiry?: number;
  alerted?: boolean;
  problemCode?: string;
}

export async function runSuklCertificateMonitor(): Promise<SuklCertificateMonitorResult> {
  if (!isSuklConfigured()) return { ran: false, reason: "not-configured" };

  const environment = suklEnvironment();
  const workplaceCode = suklWorkplaceCode();
  if (!environment || !workplaceCode) return { ran: false, reason: "not-configured" };

  const where = { environment_workplaceCode: { environment, workplaceCode } };

  try {
    const cert = await inspectSuklCertificate({ force: true });
    const suffix = fingerprintSuffix(cert.fingerprint256);
    const threshold = expiryWarnThreshold(cert.daysUntilExpiry);

    const existing = await prisma.suklFacilityIntegration.findUnique({ where });
    // Alert when a NEW (tighter) band has been entered. `lastExpiryAlertDays`
    // holds the last band alerted on, so 30 → 14 fires but 14 → 14 does not.
    const shouldAlert =
      threshold !== null &&
      (existing?.lastExpiryAlertDays == null || threshold < existing.lastExpiryAlertDays);

    await prisma.suklFacilityIntegration.update({
      where,
      data: {
        certificateFingerprint: cert.fingerprint256,
        certificateSubject: cert.subject,
        certificateIssuer: cert.issuer,
        certificateExpiresAt: cert.validTo,
        secretReference: cert.source === "base64" ? "SUKL_TEST_PFX_BASE64" : "SUKL_TEST_PFX_PATH",
        lastErrorCode: null,
        lastErrorMessage: null,
        lastErrorAt: null,
        ...(shouldAlert ? { lastExpiryAlertDays: threshold } : {}),
      },
    });

    if (shouldAlert) {
      // SÚKL confirmed (2026-08-07) that a test certificate can only be renewed
      // within one month of expiry, so the 60-day and 30-day alerts fire before
      // anything can actually be done. Say so in the alert rather than sending
      // an operator to a portal that will refuse them.
      const renewable = cert.daysUntilExpiry <= 31;
      await emitOpsAlert({
        severity: threshold <= 14 ? "critical" : "warning",
        title: `SÚKL ${environment} certificate expires in ${cert.daysUntilExpiry} day(s)`,
        detail:
          `Workplace ${workplaceCode}, certificate …${suffix}. ` +
          (renewable
            ? "Renew now at https://testpristupy.sukl.cz/ (guide: " +
              "https://testpristupy.sukl.cz/documents/nasledneVydaniCert.pdf), then follow " +
              "the rotation runbook in docs/sukl/TESTING_RUNBOOK.md — the new .pfx will need " +
              "the same RC2 conversion."
            : "SÚKL only permits renewal within ONE MONTH of expiry, so this is advance " +
              "notice — nothing can be requested yet. Diarise it for " +
              `${new Date(cert.validTo.getTime() - 30 * 86_400_000).toISOString().slice(0, 10)}.`),
        context: {
          workplaceCode,
          environment,
          daysUntilExpiry: cert.daysUntilExpiry,
          renewable,
        },
      });
    }

    return { ran: true, daysUntilExpiry: cert.daysUntilExpiry, alerted: shouldAlert };
  } catch (error) {
    const code = isSuklError(error) ? error.code : "SUKL_CERTIFICATE_INVALID";
    const message = isSuklError(error)
      ? error.safeMessage
      : "The certificate could not be validated.";

    // `updateMany` rather than `update`: on a deployment that has never run the
    // connection test there is no row yet, and a missing row must not turn a
    // monitoring failure into a Prisma exception.
    await prisma.suklFacilityIntegration.updateMany({
      where: { environment, workplaceCode },
      data: { status: "ERROR", lastErrorCode: code, lastErrorMessage: message, lastErrorAt: new Date() },
    });

    await emitOpsAlert({
      severity: "critical",
      title: `SÚKL ${environment} certificate is not usable (${code})`,
      detail: `Workplace ${workplaceCode}. ${message}`,
      context: { workplaceCode, environment, code },
    });

    return { ran: true, problemCode: code };
  }
}
