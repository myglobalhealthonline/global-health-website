import { ShieldCheck, ShieldX } from "lucide-react";
import type { Metadata } from "next";
import { buildPublicMetadata } from "@/lib/seo/page-seo";
import { GH2FlowHeader } from "@/components/sections/GH2PagePrimitives";
import { getPageLocale } from "@/lib/i18n/get-page-locale";
import { loadLocaleBundle } from "@/lib/i18n/load-locale";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getPageLocale(); const certificate = loadLocaleBundle(locale).home.flow.certificate;
  return buildPublicMetadata({ path: "/verify/certificate", title: certificate.headerTitle, description: certificate.headerSubtitle, locale, kind: "page", subtitle: certificate.stepVerify, noindex: true });
}

type CertificateData = {
  certificateId: string;
  certificateName: string;
  doctorName: string;
  patientName: string;
  consultationDate: string | null;
  issuedAt: string;
  dateInfo: { date?: string; from?: string; to?: string };
};

async function fetchCertificate(
  id: string,
): Promise<{ ok: true; data: CertificateData } | { ok: false; message: string }> {
  try {
    const baseUrl =
      process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "") ??
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
    const res = await fetch(`${baseUrl}/api/public/certificates/${encodeURIComponent(id)}`, {
      cache: "no-store",
    });
    const json = await res.json();
    if (!res.ok || !json?.ok) {
      return { ok: false, message: json?.message ?? "Certificate not found" };
    }
    return { ok: true, data: json.data as CertificateData };
  } catch {
    return { ok: false, message: "Could not load certificate" };
  }
}

export default async function CertificateVerifyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [result, locale] = await Promise.all([fetchCertificate(id), getPageLocale()]);
  const { home } = loadLocaleBundle(locale);
  const cert = home.flow.certificate;

  return (
    <>
      <GH2FlowHeader
        title={cert.headerTitle}
        subtitle={cert.headerSubtitle}
        activeStep={1}
        steps={[cert.stepVerify]}
      />
      <section className="bg-[var(--color-background-soft)] px-5 py-12 sm:py-16">
        <div className="mx-auto max-w-lg">
          {result.ok ? (
            <div className="gh-card p-8">
              <div className="mb-6 flex items-center gap-3">
                <ShieldCheck className="size-8 text-emerald-600" aria-hidden />
                <div>
                  <p className="text-lg font-bold text-[var(--color-text-primary)]">
                    {cert.verifiedTitle}
                  </p>
                  <p className="text-sm text-[var(--color-text-muted)]">
                    {cert.verifiedBody}
                  </p>
                </div>
              </div>

              <div className="space-y-3 text-sm">
                <Row label="Certificate ID" value={result.data.certificateId} mono />
                <Row label="Certificate type" value={result.data.certificateName} />
                <Row label="Patient" value={result.data.patientName} />
                <Row label="Doctor" value={result.data.doctorName} />
                {result.data.consultationDate ? (
                  <Row label="Consultation date" value={result.data.consultationDate} />
                ) : null}
                <Row label="Issued on" value={result.data.issuedAt} />
                {result.data.dateInfo.date ? (
                  <Row label="Certificate date" value={result.data.dateInfo.date} />
                ) : null}
                {result.data.dateInfo.from ? (
                  <Row label="From" value={result.data.dateInfo.from} />
                ) : null}
                {result.data.dateInfo.to ? (
                  <Row label="To" value={result.data.dateInfo.to} />
                ) : null}
              </div>

              <p className="mt-6 text-xs text-[var(--color-text-muted)]">
                {cert.confirmAuthenticityHint}
              </p>
            </div>
          ) : (
            <div className="gh-card p-8">
              <div className="flex items-center gap-3">
                <ShieldX className="size-8 text-red-600" aria-hidden />
                <div>
                  <p className="text-lg font-bold text-[var(--color-text-primary)]">
                    {cert.notFoundTitle}
                  </p>
                  <p className="mt-1 text-sm text-[var(--color-text-muted)]">
                    {result.message}. Check that the QR code or certificate ID is correct.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>
    </>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex justify-between gap-4 border-b border-[var(--color-border)] pb-2">
      <span className="font-semibold text-[var(--color-text-muted)]">{label}</span>
      <span
        className={`text-right text-[var(--color-text-primary)] ${mono ? "font-mono text-xs" : ""}`}
      >
        {value}
      </span>
    </div>
  );
}
