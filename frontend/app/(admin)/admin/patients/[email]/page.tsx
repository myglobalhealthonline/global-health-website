import Link from "next/link";
import { ArrowLeft, ShieldCheck, FileText, CreditCard, History, Globe } from "lucide-react";
import {
  fetchAdminPatientProfile,
  fetchAdminPatientNationality,
  fetchAdminPatientConsents,
  fetchAdminPatientAccessLog,
  fetchAdminPatientPayments,
  type VerificationStatus,
} from "@/lib/admin/admin-api";
import { AdminCard, PageHeader, Pill } from "../../_components/atoms";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ email: string }> };

function verificationTone(status: VerificationStatus): "active" | "inactive" | "pending" | "neutral" {
  switch (status) {
    case "VERIFIED": return "active";
    case "REJECTED": return "inactive";
    case "PENDING": return "pending";
    default: return "neutral";
  }
}

function StatusBadge({ status }: { status: VerificationStatus }) {
  const label = status === "NOT_VERIFIED" ? "Not verified" : status.charAt(0) + status.slice(1).toLowerCase();
  return <Pill tone={verificationTone(status)}>{label}</Pill>;
}

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <AdminCard>
      <h2 className="mb-4 flex items-center gap-2 text-[15px] font-bold text-[var(--color-text-primary)]">
        <span className="text-[var(--color-accent)]">{icon}</span>
        {title}
      </h2>
      {children}
    </AdminCard>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-[var(--color-border)] py-2 last:border-0">
      <span className="shrink-0 text-[13px] text-[var(--color-text-muted)]">{label}</span>
      <span className="text-right text-[13px] font-medium text-[var(--color-text-primary)]">{value ?? "—"}</span>
    </div>
  );
}

function fmt(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function fmtAmount(cents: number, currency: string) {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency }).format(cents / 100);
}

export default async function AdminPatientDetailPage({ params }: PageProps) {
  const { email: rawEmail } = await params;
  const email = decodeURIComponent(rawEmail);

  const [profileRes, nationalityRes, consentsRes, accessLogRes, paymentsRes] = await Promise.all([
    fetchAdminPatientProfile(email),
    fetchAdminPatientNationality(email),
    fetchAdminPatientConsents(email),
    fetchAdminPatientAccessLog(email),
    fetchAdminPatientPayments(email),
  ]);

  if (!profileRes.ok || !profileRes.data.profile) {
    return (
      <>
        <Link href="/admin/patients" className="mb-2 inline-flex items-center gap-1.5 text-[13px] font-semibold text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]">
          <ArrowLeft className="size-3.5" /> Back to patients
        </Link>
        <PageHeader eyebrow="Patient" title="Not found" />
        <AdminCard>
          <p className="text-sm text-[var(--color-status-warning-text)]">
            {profileRes.ok ? "Patient profile not found." : profileRes.message}
          </p>
        </AdminCard>
      </>
    );
  }

  const profile = profileRes.data.profile;
  const nationalities = nationalityRes.ok ? nationalityRes.data.nationalityDocuments : [];
  const consents = consentsRes.ok ? consentsRes.data.consents : [];
  const accessLogs = accessLogRes.ok ? accessLogRes.data.logs : [];
  const payments = paymentsRes.ok ? paymentsRes.data.items : [];

  return (
    <>
      <Link href="/admin/patients" className="mb-2 inline-flex items-center gap-1.5 text-[13px] font-semibold text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]">
        <ArrowLeft className="size-3.5" /> Back to patients
      </Link>
      <PageHeader
        eyebrow="Patient"
        title={profile.fullName ?? profile.email}
        description={profile.email}
        actions={
          profile.globalHealthNumber ? (
            <code className="rounded bg-[var(--color-surface-raised)] px-3 py-1 text-sm font-bold">
              {profile.globalHealthNumber}
            </code>
          ) : null
        }
      />

      {/* ── Overview ──────────────────────────────────────────────────── */}
      <Section icon={<Globe className="size-4" />} title="Patient overview">
        <div className="grid gap-x-8 gap-y-0 sm:grid-cols-2">
          <div>
            <Row label="Global Health No." value={<code className="text-xs">{profile.globalHealthNumber ?? "—"}</code>} />
            <Row label="Full name" value={profile.fullName} />
            <Row label="Email" value={profile.email} />
            <Row label="Phone" value={profile.phone} />
            <Row label="Date of birth" value={fmt(profile.dateOfBirth)} />
            <Row label="Blood type" value={profile.bloodType} />
            <Row label="Registered" value={fmt(profile.createdAt)} />
          </div>
          <div>
            <Row label="Address" value={[profile.addressLine1, profile.addressCity, profile.addressCountryCode].filter(Boolean).join(", ") || null} />
            <Row label="Preferred pharmacy" value={profile.preferredPharmacy} />
            <Row label="Pricing plan" value={profile.pricingPlanId} />
            {profile.statusAlert ? (
              <Row label="Status alert" value={<span className="text-[var(--color-status-warning-text)]">{profile.statusAlert}</span>} />
            ) : null}
            {profile.clinicAlert ? (
              <Row label="Clinic alert" value={<span className="text-[var(--color-status-warning-text)]">{profile.clinicAlert}</span>} />
            ) : null}
          </div>
        </div>
      </Section>

      {/* ── Verification ──────────────────────────────────────────────── */}
      <Section icon={<ShieldCheck className="size-4" />} title="Verification status">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {(
            [
              { label: "ID document", status: profile.idVerificationStatus },
              { label: "Email", status: profile.emailVerificationStatus },
              { label: "Phone", status: profile.phoneVerificationStatus },
              { label: "Insurance", status: profile.insuranceDocumentStatus },
            ] as { label: string; status: VerificationStatus }[]
          ).map(({ label, status }) => (
            <div key={label} className="flex flex-col gap-1 rounded border border-[var(--color-border)] p-3">
              <span className="text-[12px] text-[var(--color-text-muted)]">{label}</span>
              <StatusBadge status={status} />
            </div>
          ))}
        </div>
        {profile.insuranceProviderName ? (
          <p className="mt-3 text-[13px] text-[var(--color-text-muted)]">
            Insurance provider: <strong>{profile.insuranceProviderName}</strong>
          </p>
        ) : null}
      </Section>

      {/* ── Nationality documents ─────────────────────────────────────── */}
      {nationalities.length > 0 ? (
        <Section icon={<FileText className="size-4" />} title="Nationality documents">
          <div className="space-y-3">
            {nationalities.map((doc) => (
              <div key={doc.id} className="rounded border border-[var(--color-border)] p-3">
                <div className="flex items-center justify-between">
                  <span className="text-[13px] font-medium">Slot {doc.slotNumber} — {doc.nationalityCountry}</span>
                  <StatusBadge status={doc.verificationStatus} />
                </div>
                <div className="mt-1 text-[12px] text-[var(--color-text-muted)]">
                  {doc.documentType}{doc.expiryDate ? ` · Expires ${fmt(doc.expiryDate)}` : ""}
                </div>
                {doc.adminNotes ? (
                  <p className="mt-1 text-[12px] italic text-[var(--color-status-warning-text)]">{doc.adminNotes}</p>
                ) : null}
              </div>
            ))}
          </div>
        </Section>
      ) : null}

      {/* ── GDPR Consents ─────────────────────────────────────────────── */}
      {consents.length > 0 ? (
        <Section icon={<ShieldCheck className="size-4" />} title="GDPR consents">
          <div className="overflow-x-auto">
            <table className="gh-table">
              <thead>
                <tr>
                  <th>Consent type</th>
                  <th>Status</th>
                  <th>Version</th>
                  <th>Last updated</th>
                </tr>
              </thead>
              <tbody>
                {consents.map((c) => (
                  <tr key={c.consentType}>
                    <td>
                      <div className="font-medium">{c.label}</div>
                      <div className="text-[11px] text-[var(--color-text-muted)]">{c.description}</div>
                    </td>
                    <td>
                      {c.consentValue === null ? (
                        <Pill tone="neutral">Not set</Pill>
                      ) : c.consentValue ? (
                        <Pill tone="active">Accepted</Pill>
                      ) : (
                        <Pill tone="inactive">Declined</Pill>
                      )}
                    </td>
                    <td className="text-[var(--color-text-muted)]">{c.consentVersion ?? "—"}</td>
                    <td className="text-[var(--color-text-muted)]">{fmt(c.lastUpdatedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      ) : null}

      {/* ── Medical access log ────────────────────────────────────────── */}
      <Section icon={<History className="size-4" />} title="Medical access log">
        {accessLogs.length === 0 ? (
          <p className="text-sm text-[var(--color-text-muted)]">No access history available yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="gh-table">
              <thead>
                <tr>
                  <th>Accessed by</th>
                  <th>Role</th>
                  <th>Resource</th>
                  <th>Action</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {accessLogs.map((log) => (
                  <tr key={log.id}>
                    <td>{log.accessedByName ?? "—"}</td>
                    <td className="text-[var(--color-text-muted)]">{log.accessedByRole}</td>
                    <td>{log.accessedResourceType}</td>
                    <td>{log.accessAction}</td>
                    <td className="text-[var(--color-text-muted)]">{fmt(log.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      {/* ── Payment history ───────────────────────────────────────────── */}
      <Section icon={<CreditCard className="size-4" />} title="Payment history">
        {payments.length === 0 ? (
          <p className="text-sm text-[var(--color-text-muted)]">No payments found yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="gh-table">
              <thead>
                <tr>
                  <th>Service</th>
                  <th>Doctor</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.id}>
                    <td>{p.serviceName ?? "—"}</td>
                    <td className="text-[var(--color-text-muted)]">{p.doctorName ?? "—"}</td>
                    <td className="font-medium">{fmtAmount(p.amountCents, p.currencyCode)}</td>
                    <td>
                      <Pill tone={p.status === "PAID" ? "active" : p.status === "FAILED" ? "inactive" : "pending"}>
                        {p.status}
                      </Pill>
                    </td>
                    <td className="text-[var(--color-text-muted)]">{fmt(p.paidAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>
    </>
  );
}
