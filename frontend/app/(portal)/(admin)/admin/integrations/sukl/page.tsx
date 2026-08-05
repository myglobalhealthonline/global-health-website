import { fetchSuklStatus } from "@/lib/admin/admin-api";
import { AdminCard, PageHeader, Pill, StatCard } from "../../_components/atoms";
import { SuklConnectionPanel } from "./_components/sukl-connection-panel";
import { SuklDoctorIdentities } from "./_components/sukl-doctor-identities";

export const dynamic = "force-dynamic";

/**
 * SÚKL integration console (Czech ePoukaz / eRecept).
 *
 * Read-only mirror of what the backend can prove about the facility's
 * connection, plus the two actions an admin actually needs: run the connection
 * test, and map a doctor to their SÚKL professional identity.
 *
 * There is no certificate upload here on purpose — the certificate is a Railway
 * secret and rotation is a redeploy. See docs/sukl/TESTING_RUNBOOK.md.
 *
 * Nothing on this page can reach the certificate or its password: no SUKL_*
 * variable exists on the frontend service, and the backend only ever returns
 * public certificate metadata plus the last 8 fingerprint characters.
 */

function fmtDateTime(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default async function AdminSuklPage() {
  const fetched = await fetchSuklStatus();

  if (!fetched.ok) {
    return (
      <>
        <PageHeader
          eyebrow="Integrations"
          title="SÚKL — ePoukaz"
          description="Czech State Institute for Drug Control. Test environment."
        />
        <AdminCard>
          <p className="gh-status-warning rounded-md border px-4 py-3 text-sm">{fetched.message}</p>
        </AdminCard>
      </>
    );
  }

  const { status, doctorIdentities } = fetched.data;

  // Expiry drives the tone: inside 14 days is a warning an admin must act on,
  // because a lapsed certificate takes ePoukaz down with no other signal.
  const certTone = !status.certificateValid
    ? "warning"
    : status.daysUntilExpiry !== null && status.daysUntilExpiry <= 14
      ? "warning"
      : "success";

  return (
    <>
      <PageHeader
        eyebrow="Integrations"
        title="SÚKL — ePoukaz"
        description="Czech State Institute for Drug Control. Mutual TLS with the facility's workplace communication certificate — no doctor signing key is used or stored."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Environment"
          value={status.environment ? status.environment.toUpperCase() : "NOT SET"}
          hint="Production is intentionally blocked in code"
          tone={status.environment === "test" ? "brand" : "warning"}
        />
        <StatCard
          label="Certificate"
          value={status.certificateValid ? "Valid" : "Unusable"}
          hint={
            status.certificateValid
              ? `Expires ${fmtDate(status.expiresAt)}${
                  status.daysUntilExpiry !== null ? ` · ${status.daysUntilExpiry} days` : ""
                }`
              : (status.problem?.code ?? "Not loaded")
          }
          tone={certTone}
        />
        <StatCard
          label="Last connection"
          value={status.lastConnectionAt ? fmtDateTime(status.lastConnectionAt) : "Never"}
          hint={`${status.services.filter((s) => s.configured).length}/${status.services.length} services configured`}
          tone={status.lastConnectionAt ? "success" : "neutral"}
        />
        <StatCard
          label="Mapped doctors"
          value={status.doctorIdentityCount}
          hint="SÚKL professional identities"
          tone={status.doctorIdentityCount > 0 ? "brand" : "neutral"}
        />
      </div>

      <AdminCard>
        <h2 className="m-0 mb-3 text-sm font-bold">Facility</h2>
        <dl className="grid gap-x-8 gap-y-2 text-sm sm:grid-cols-2">
          <Row label="Legal entity">Global Guest s.r.o.</Row>
          <Row label="IČO">{status.ico ?? "—"}</Row>
          <Row label="Workplace code">{status.workplaceCode ?? "—"}</Row>
          <Row label="Workplace type">Ambulance / outpatient</Row>
          <Row label="Certificate authority">SÚKL (ÚZIS test CA unavailable)</Row>
          <Row label="Certificate source">
            {status.certificateSource === "base64"
              ? "SUKL_TEST_PFX_BASE64 (Railway)"
              : status.certificateSource === "path"
                ? "SUKL_TEST_PFX_PATH (local)"
                : "—"}
          </Row>
          <Row label="Subject">{status.subject ?? "—"}</Row>
          <Row label="Issuer">{status.issuer ?? "—"}</Row>
          <Row label="Serial">{status.serialNumber ?? "—"}</Row>
          <Row label="Valid from">{fmtDate(status.validFrom)}</Row>
          <Row label="Fingerprint (SHA-256)">
            {status.fingerprintSuffix ? `…${status.fingerprintSuffix}` : "—"}
          </Row>
        </dl>

        <p className="mt-3 mb-0 text-xs" style={{ color: "var(--portal-muted)" }}>
          The certificate subject&rsquo;s <code>O</code> and <code>OU</code> are SÚKL&rsquo;s own
          identifiers. They are not expected to equal the workplace code above, and nothing
          compares them — their exact semantics are still unconfirmed.
        </p>

        {status.problem ? (
          <p className="gh-status-warning mt-4 rounded-md border px-4 py-3 text-sm">
            <strong>{status.problem.code}</strong> — {status.problem.message}
          </p>
        ) : null}

        {status.lastErrorCode ? (
          <p
            className="mt-3 text-xs"
            style={{ color: "var(--portal-muted)" }}
          >
            Last recorded error: <strong>{status.lastErrorCode}</strong> at{" "}
            {fmtDateTime(status.lastErrorAt)}
          </p>
        ) : null}
      </AdminCard>

      <AdminCard>
        <h2 className="m-0 mb-1 text-sm font-bold">Services</h2>
        <p className="m-0 mb-3 text-xs" style={{ color: "var(--portal-muted)" }}>
          Host roots only. Each operation&rsquo;s path must come from the{" "}
          <code>soap:address</code> in the current ePoukaz v19 WSDL — these are not complete
          endpoints. The cross-border pharmacist service is deliberately not configured.
        </p>
        <dl className="grid gap-x-8 gap-y-2 text-sm">
          {status.services.map((s) => (
            <Row key={s.service} label={s.label}>
              {s.configured ? (
                <span className="break-all">
                  <Pill tone="active">Set</Pill> <code className="text-xs">{s.url}</code>
                </span>
              ) : (
                <span>
                  <Pill tone="pending">Not set</Pill>{" "}
                  <code className="text-xs">{s.envVar}</code>
                </span>
              )}
            </Row>
          ))}
        </dl>
      </AdminCard>

      <AdminCard>
        <SuklConnectionPanel configured={status.configured} />
      </AdminCard>

      <AdminCard>
        <SuklDoctorIdentities
          identities={doctorIdentities}
          configured={status.configured}
          workplaceCode={status.workplaceCode}
        />
      </AdminCard>

      <AdminCard>
        <h2 className="m-0 mb-2 text-sm font-bold">Not yet implemented</h2>
        <p className="m-0 text-sm" style={{ color: "var(--portal-text-2)" }}>
          ePoukaz creation, status lookup and cancellation are not built. Their operation names,
          XML namespaces and required fields come from SÚKL&rsquo;s WSDL/XSD, which has not been
          supplied — see <code>docs/sukl/INTERFACE_INVENTORY.md</code> for the blocker list and
          <code> docs/sukl/SCOPE_CONFIRMATION.md</code> for the questions still open with SÚKL.
          Cross-border eRecept is out of scope until SÚKL confirms an outpatient workplace may
          perform it.
        </p>
      </AdminCard>
    </>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:gap-3">
      <dt
        className="text-[10.5px] font-bold uppercase tracking-[0.12em] sm:w-44 sm:shrink-0"
        style={{ color: "var(--portal-muted)" }}
      >
        {label}
      </dt>
      <dd className="m-0 break-words">{children}</dd>
    </div>
  );
}
