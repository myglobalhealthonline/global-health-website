"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import {
  AdminEmptyState,
  AdminTable,
  Btn,
  Pill,
  Td,
  Th,
  Thead,
  Tr,
  type PillTone,
} from "../../../_components/atoms";
import type {
  SuklDoctorIdentityDto,
  SuklDoctorIdentityStatus,
} from "@/lib/admin/admin-api/sukl";

/**
 * Maps a platform doctor to their SÚKL professional identity.
 *
 * A mapping is created UNVERIFIED and stays that way until a real SÚKL call
 * succeeds under the identifier — a pasted code is a claim, not a fact. Editing
 * an identifier resets verification for the same reason.
 *
 * The identifier field is loose on purpose: SÚKL has not told us whether it is
 * an IČP, a KRZP code or their own value, so the backend validates only shape
 * and length. Tightening it before they answer would reject valid input.
 */

const STATUS_TONES: Record<SuklDoctorIdentityStatus, PillTone> = {
  UNVERIFIED: "pending",
  VERIFIED: "active",
  REJECTED: "inactive",
  REVOKED: "inactive",
};

export function SuklDoctorIdentities({
  identities,
  configured,
  workplaceCode,
}: {
  identities: SuklDoctorIdentityDto[];
  configured: boolean;
  workplaceCode: string | null;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [form, setForm] = useState({
    doctorUserId: "",
    suklProfessionalIdentifier: "",
    suklUsernameOrReference: "",
    specialityCode: "",
    notes: "",
  });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch(
        `/api/admin/sukl/doctor-identities/${encodeURIComponent(form.doctorUserId.trim())}`,
        {
          method: "PUT",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            suklProfessionalIdentifier: form.suklProfessionalIdentifier.trim(),
            suklUsernameOrReference: form.suklUsernameOrReference.trim() || null,
            specialityCode: form.specialityCode.trim() || null,
            notes: form.notes.trim() || null,
          }),
        },
      );
      const json = (await res.json().catch(() => null)) as
        | { ok?: boolean; message?: string }
        | null;
      if (!res.ok || !json?.ok) {
        setMessage({ tone: "error", text: json?.message ?? "The mapping could not be saved" });
        return;
      }
      setMessage({ tone: "ok", text: "Mapping saved as UNVERIFIED" });
      setForm({
        doctorUserId: "",
        suklProfessionalIdentifier: "",
        suklUsernameOrReference: "",
        specialityCode: "",
        notes: "",
      });
      router.refresh();
    } catch {
      setMessage({ tone: "error", text: "The mapping could not be saved" });
    } finally {
      setBusy(false);
    }
  }

  async function revoke(doctorUserId: string) {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch(
        `/api/admin/sukl/doctor-identities/${encodeURIComponent(doctorUserId)}`,
        { method: "DELETE" },
      );
      const json = (await res.json().catch(() => null)) as
        | { ok?: boolean; message?: string }
        | null;
      if (!res.ok || !json?.ok) {
        setMessage({ tone: "error", text: json?.message ?? "The mapping could not be revoked" });
        return;
      }
      setMessage({ tone: "ok", text: "Mapping revoked" });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  const canSubmit =
    configured && !busy && form.doctorUserId.trim() && form.suklProfessionalIdentifier.trim();

  return (
    <div>
      <h2 className="m-0 mb-1 text-sm font-bold">Doctor identities</h2>
      <p className="m-0 mb-4 text-xs" style={{ color: "var(--portal-muted)" }}>
        Prescribers registered with SÚKL under workplace {workplaceCode ?? "—"}. No national
        personal identifier and no personal signing certificate is stored — authentication runs on
        the facility certificate.
      </p>

      {identities.length === 0 ? (
        <AdminEmptyState
          title="No doctors mapped"
          description="Map a doctor once SÚKL has issued their test prescriber identifier."
        />
      ) : (
        <AdminTable>
          <Thead>
            <Th>Doctor user id</Th>
            <Th>SÚKL identifier</Th>
            <Th>Speciality</Th>
            <Th>Status</Th>
            <Th>Updated</Th>
            <Th> </Th>
          </Thead>
          <tbody>
            {identities.map((i) => (
              <Tr key={i.id}>
                <Td>
                  <code className="text-xs">{i.doctorUserId}</code>
                </Td>
                <Td>{i.suklProfessionalIdentifier}</Td>
                <Td>{i.specialityCode ?? "—"}</Td>
                <Td>
                  <Pill tone={STATUS_TONES[i.status]}>{i.status}</Pill>
                </Td>
                <Td>{new Date(i.updatedAt).toLocaleDateString()}</Td>
                <Td>
                  {i.status === "REVOKED" ? null : (
                    <Btn
                      variant="danger"
                      size="sm"
                      disabled={busy}
                      onClick={() => void revoke(i.doctorUserId)}
                    >
                      Revoke
                    </Btn>
                  )}
                </Td>
              </Tr>
            ))}
          </tbody>
        </AdminTable>
      )}

      <form onSubmit={submit} className="mt-5 grid gap-3 sm:grid-cols-2">
        <Field
          label="Doctor user id"
          value={form.doctorUserId}
          onChange={(v) => setForm((f) => ({ ...f, doctorUserId: v }))}
          required
        />
        <Field
          label="SÚKL prescriber identifier"
          value={form.suklProfessionalIdentifier}
          onChange={(v) => setForm((f) => ({ ...f, suklProfessionalIdentifier: v }))}
          required
        />
        <Field
          label="SÚKL username / reference"
          value={form.suklUsernameOrReference}
          onChange={(v) => setForm((f) => ({ ...f, suklUsernameOrReference: v }))}
        />
        <Field
          label="Speciality code (odbornost)"
          value={form.specialityCode}
          onChange={(v) => setForm((f) => ({ ...f, specialityCode: v }))}
        />
        <div className="sm:col-span-2">
          <Field
            label="Notes"
            value={form.notes}
            onChange={(v) => setForm((f) => ({ ...f, notes: v }))}
          />
        </div>
        <div className="sm:col-span-2">
          <Btn type="submit" variant="primary" size="sm" disabled={!canSubmit}>
            {busy ? "Saving…" : "Save mapping"}
          </Btn>
        </div>
      </form>

      {message ? (
        <p
          className={`${message.tone === "ok" ? "gh-status-success" : "gh-status-warning"} mt-3 rounded-md border px-4 py-3 text-sm`}
        >
          {message.text}
        </p>
      ) : null}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  required = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
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
      <input
        className="gh-input"
        value={value}
        required={required}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}
