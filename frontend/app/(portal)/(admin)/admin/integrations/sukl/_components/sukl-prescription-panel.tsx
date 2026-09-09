"use client";

import { useState } from "react";

import { AdminCard, Btn, Pill } from "../../../_components/atoms";
import type { SuklIssuePrescriptionDto } from "@/lib/admin/admin-api/sukl";

/**
 * Issues a real eRecept into SÚKL's test system.
 *
 * Unlike every other control on this page, this one CREATES something. SÚKL
 * hold the result, so the panel is deliberate rather than convenient: one
 * medicine, an explicit confirmation, and the identifiers shown afterwards so
 * the prescription can be withdrawn again.
 *
 * The ambiguous outcome is treated as its own case. If SÚKL accept the request
 * but return no document id, the prescription may or may not exist and pressing
 * Issue again could create a second one — so the panel says so and offers no
 * retry.
 */

export function SuklPrescriptionPanel({ callable }: { callable: boolean }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SuklIssuePrescriptionDto | null>(null);
  const [cancelled, setCancelled] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  const [form, setForm] = useState({
    doctorUserId: "",
    surname: "",
    givenNames: "",
    dateOfBirth: "",
    insuranceNumber: "",
    insurerCode: "",
    medicineName: "",
    medicineCode: "",
    unregistered: true,
    quantity: "1",
    instructions: "",
    note: "",
  });

  const canSubmit =
    callable &&
    !busy &&
    form.doctorUserId.trim().length > 0 &&
    form.medicineName.trim().length > 0 &&
    form.instructions.trim().length > 0;

  async function issue() {
    setBusy(true);
    setError(null);
    setResult(null);
    setCancelled(null);
    try {
      const res = await fetch("/api/admin/sukl/prescriptions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          doctorUserId: form.doctorUserId.trim(),
          patient: {
            surname: form.surname.trim() || undefined,
            givenNames: form.givenNames.trim() || undefined,
            dateOfBirth: form.dateOfBirth.trim() || undefined,
            insuranceNumber: form.insuranceNumber.trim() || undefined,
            insurerCode: form.insurerCode.trim() || undefined,
          },
          items: [
            {
              quantity: Number(form.quantity) || 1,
              instructions: form.instructions.trim(),
              reimbursement: "PACIENT",
              medicineName: form.medicineName.trim(),
              ...(form.medicineCode.trim() ? { medicineCode: form.medicineCode.trim() } : {}),
              unregistered: form.unregistered,
            },
          ],
          note: form.note.trim() || undefined,
        }),
      });
      const json = (await res.json().catch(() => null)) as
        | { ok?: boolean; message?: string; data?: SuklIssuePrescriptionDto }
        | null;
      if (!res.ok || !json?.ok || !json.data) {
        setError(json?.message ?? "The prescription could not be sent");
        return;
      }
      setResult(json.data);
    } catch {
      setError("The prescription could not be sent");
    } finally {
      setBusy(false);
      setConfirming(false);
    }
  }

  async function cancel(prescriptionId: string) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/sukl/prescriptions/cancel", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ prescriptionId, reason: "Test prescription withdrawn" }),
      });
      const json = (await res.json().catch(() => null)) as
        | { ok?: boolean; message?: string; data?: { ok: boolean; errorMessage: string | null } }
        | null;
      if (!res.ok || !json?.ok || !json.data?.ok) {
        setError(json?.data?.errorMessage ?? json?.message ?? "The withdrawal was refused");
        return;
      }
      setCancelled(prescriptionId);
    } catch {
      setError("The withdrawal could not be sent");
    } finally {
      setBusy(false);
    }
  }

  const ambiguous = result && !result.ok && result.errorCode === "SUKL_DUPLICATE_OR_UNKNOWN_RESULT";

  return (
    <AdminCard>
      <h2 className="m-0 mb-2 text-sm font-bold">Issue a test prescription</h2>
      <p className="m-0 mb-3 text-sm" style={{ color: "var(--portal-muted)" }}>
        This creates a real eRecept in SÚKL&rsquo;s test system — it is not a probe. The doctor must
        already have a SÚKL mapping with a phone, IČP and PZS, and a signing certificate must be
        configured: SÚKL require the prescriber&rsquo;s qualified signature on this operation.
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        <F label="Doctor user id" required value={form.doctorUserId} on={(v) => setForm((f) => ({ ...f, doctorUserId: v }))} />
        <F label="Medicine name" required value={form.medicineName} on={(v) => setForm((f) => ({ ...f, medicineName: v }))} />
        <F label="Patient surname" value={form.surname} on={(v) => setForm((f) => ({ ...f, surname: v }))} />
        <F label="Patient given names" value={form.givenNames} on={(v) => setForm((f) => ({ ...f, givenNames: v }))} />
        <F label="Date of birth (YYYY-MM-DD)" value={form.dateOfBirth} on={(v) => setForm((f) => ({ ...f, dateOfBirth: v }))} />
        <F label="Insurance number (9–10 digits)" value={form.insuranceNumber} on={(v) => setForm((f) => ({ ...f, insuranceNumber: v }))} />
        <div>
          {/* The codes belong under the field, not in the label: with the list
              inline an operator reasonably types "111 VZP", which fails the
              three-digit rule and is rejected before SÚKL is ever contacted. */}
          <F
            label="Insurer code (3 digits)"
            value={form.insurerCode}
            on={(v) => setForm((f) => ({ ...f, insurerCode: v }))}
          />
          <p className="m-0 mt-1 text-xs" style={{ color: "var(--portal-muted)" }}>
            Digits only. 111 VZP · 201 VoZP · 205 ČPZP · 207 OZP · 209 ZPŠ · 211 ZPMV · 213 RBP
          </p>
        </div>
        <F
          label="SÚKL medicine code — 7 digits, optional"
          value={form.medicineCode}
          on={(v) => setForm((f) => ({ ...f, medicineCode: v }))}
        />
        <label className="flex items-center gap-2 text-xs">
          <input
            type="checkbox"
            checked={form.unregistered}
            onChange={(e) => setForm((f) => ({ ...f, unregistered: e.target.checked }))}
          />
          <span>
            Send as an unregistered product (<code>HVLPNereg</code>)
          </span>
        </label>
        <div className="sm:col-span-2">
          <p className="m-0 text-xs" style={{ color: "var(--portal-muted)" }}>
            A REGISTERED product is matched against SÚKL&rsquo;s DLP register by name, form,
            strength and package; a near-miss is rejected with C013. Leave the box ticked unless
            you have the exact registered name or the 7-digit code — codes are searchable at
            prehledy.sukl.cz.
          </p>
        </div>
        <F label="Quantity (1–999)" value={form.quantity} on={(v) => setForm((f) => ({ ...f, quantity: v }))} />
        <div className="sm:col-span-2">
          <F
            label="Instructions — Da signa, max 80 characters, no “D.S.” prefix"
            required
            value={form.instructions}
            on={(v) => setForm((f) => ({ ...f, instructions: v }))}
          />
        </div>
        <div className="sm:col-span-2">
          <F label="Note" value={form.note} on={(v) => setForm((f) => ({ ...f, note: v }))} />
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {confirming ? (
          <>
            <Btn onClick={() => void issue()} disabled={!canSubmit} variant="primary" size="sm">
              {busy ? "Issuing…" : "Yes — create it at SÚKL"}
            </Btn>
            <Btn onClick={() => setConfirming(false)} disabled={busy} variant="secondary" size="sm">
              Cancel
            </Btn>
          </>
        ) : (
          <Btn onClick={() => setConfirming(true)} disabled={!canSubmit} variant="primary" size="sm">
            Issue prescription
          </Btn>
        )}
      </div>

      {error ? (
        <p className="mt-3 text-sm" style={{ color: "var(--portal-danger, #b42318)" }}>
          {error}
        </p>
      ) : null}

      {result ? (
        <div
          className="mt-3 rounded-md border px-4 py-3 text-sm"
          style={{ borderColor: "var(--portal-line)" }}
        >
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <Pill tone={result.ok ? "active" : ambiguous ? "pending" : "inactive"} withDot>
              {result.ok ? "Issued" : ambiguous ? "Outcome unknown" : `Rejected — ${result.errorCode}`}
            </Pill>
            <span className="text-xs" style={{ color: "var(--portal-muted)" }}>
              HTTP {result.httpStatus} · {result.durationMs} ms
            </span>
          </div>

          {result.ok ? (
            <>
              <p className="m-0 text-sm">
                SÚKL document id <strong>{result.documentId}</strong>
              </p>
              <p className="m-0 mt-1 text-xs" style={{ color: "var(--portal-muted)" }}>
                Submission id <code>{result.submissionId}</code> — SÚKL treat this as the
                authorisation id for withdrawing or amending the prescription, and it is stored
                against the record.
              </p>
              {cancelled === result.prescriptionId ? (
                <p className="m-0 mt-2 text-sm">Withdrawn.</p>
              ) : (
                <Btn
                  onClick={() => void cancel(result.prescriptionId)}
                  disabled={busy}
                  variant="secondary"
                  size="sm"
                >
                  {busy ? "Withdrawing…" : "Withdraw this prescription"}
                </Btn>
              )}
            </>
          ) : (
            <>
              <p className="m-0 whitespace-pre-wrap break-words text-sm">{result.errorMessage}</p>
              {result.errorAdvice ? (
                <p className="m-0 mt-1 text-xs" style={{ color: "var(--portal-muted)" }}>
                  SÚKL suggest: {result.errorAdvice}
                </p>
              ) : null}
              {ambiguous ? (
                <p className="m-0 mt-2 text-xs" style={{ color: "var(--portal-muted)" }}>
                  Do not press Issue again. SÚKL may already hold this prescription, and a second
                  attempt would create a duplicate. Check the prescription list at SÚKL first.
                </p>
              ) : null}
            </>
          )}
        </div>
      ) : null}
    </AdminCard>
  );
}

function F({
  label,
  value,
  on,
  required = false,
}: {
  label: string;
  value: string;
  on: (v: string) => void;
  required?: boolean;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span
        className="text-[10.5px] font-bold uppercase tracking-[0.12em]"
        style={{ color: "var(--portal-muted)" }}
      >
        {label}
        {required ? " *" : ""}
      </span>
      <input className="gh-input" value={value} required={required} onChange={(e) => on(e.target.value)} />
    </label>
  );
}
