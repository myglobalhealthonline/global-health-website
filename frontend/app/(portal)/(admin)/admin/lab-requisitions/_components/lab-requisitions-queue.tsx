"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ColumnPriorityTable,
  type ColumnPriorityField,
} from "@/components/ColumnPriorityTable";
import type { PortalMobileCardTone } from "@/components/PortalMobileCard";
import { RecordDetailsDrawer } from "@/components/RecordDetailsDrawer";
import { AdminEmptyState, Btn, Pill, type PillTone } from "../../_components/atoms";
import type {
  LabRequisitionDto,
  LabRequisitionStatus,
} from "@/lib/admin/admin-api/lab-requisitions";

/**
 * The admin lab queue: exams a doctor prescribed, waiting for someone to ring
 * the patient, take payment and create the requisition in Synlab's WebLIMS.
 *
 * The WebLIMS handoff is a form, not an API call — `Open Synlab form` mints a
 * short-lived token server-side and hands the resulting URL to the operator's
 * browser. Because we print the sample labels ourselves, the operator normally
 * opens it in WebLIMS Browser (`wlbrowser.exe <url>`), which is why the URL is
 * shown and copyable rather than only auto-opened.
 */

const STATUS_TONES: Record<LabRequisitionStatus, PillTone> = {
  PRESCRIBED: "pending",
  PATIENT_CONFIRMED: "info",
  AWAITING_PAYMENT: "pending",
  READY_TO_SEND: "brand",
  SENT_TO_LAB: "active",
  SAMPLE_COLLECTED: "active",
  RESULT_RECEIVED: "published",
  CLOSED: "neutral",
  CANCELLED: "inactive",
};

/** The mobile card's status edge speaks a different tone vocabulary to Pill. */
const STATUS_CARD_TONES: Record<LabRequisitionStatus, PortalMobileCardTone> = {
  PRESCRIBED: "warning",
  PATIENT_CONFIRMED: "info",
  AWAITING_PAYMENT: "warning",
  READY_TO_SEND: "brand",
  SENT_TO_LAB: "info",
  SAMPLE_COLLECTED: "info",
  RESULT_RECEIVED: "success",
  CLOSED: "neutral",
  CANCELLED: "danger",
};

const STATUS_LABELS: Record<LabRequisitionStatus, string> = {
  PRESCRIBED: "Prescribed",
  PATIENT_CONFIRMED: "Confirmed with patient",
  AWAITING_PAYMENT: "Awaiting payment",
  READY_TO_SEND: "Ready to send",
  SENT_TO_LAB: "Sent to lab",
  SAMPLE_COLLECTED: "Sample collected",
  RESULT_RECEIVED: "Result received",
  CLOSED: "Closed",
  CANCELLED: "Cancelled",
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function fmtMoney(cents: number, currency: string) {
  return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(cents / 100);
}

type ActionResult = { tone: "ok" | "error"; message: string; url?: string };

export function LabRequisitionsQueue({
  requisitions,
  weblimsConfigured,
}: {
  requisitions: LabRequisitionDto[];
  weblimsConfigured: boolean;
}) {
  const router = useRouter();
  const [openId, setOpenId] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [result, setResult] = useState<ActionResult | null>(null);
  const [accepted, setAccepted] = useState<Record<string, boolean>>({});

  const selected = requisitions.find((r) => r.id === openId) ?? null;

  function openDrawer(row: LabRequisitionDto) {
    setOpenId(row.id);
    setResult(null);
    // Nothing discussed yet reads as "everything the doctor asked for", which
    // is the common case on the call — the admin unticks what the patient declines.
    setAccepted(
      Object.fromEntries(row.items.map((i) => [i.id, i.patientAccepted ?? true])),
    );
  }

  async function post(id: string, action: string, body?: unknown) {
    setBusy(action);
    setResult(null);
    try {
      const res = await fetch(`/api/admin/lab-requisitions/${id}/${action}`, {
        method: action === "status" ? "PATCH" : "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body ?? {}),
      });
      const json = (await res.json().catch(() => null)) as
        | { ok?: boolean; message?: string; data?: Record<string, unknown> }
        | null;
      if (!res.ok || !json?.ok) {
        setResult({ tone: "error", message: json?.message ?? "The request failed" });
        return null;
      }
      const url = typeof json.data?.showUrl === "string" ? json.data.showUrl : undefined;
      const payUrl =
        typeof json.data?.shortLink === "string" ? json.data.shortLink : undefined;
      setResult({
        tone: "ok",
        message: json.message ?? "Done",
        ...(url ?? payUrl ? { url: url ?? payUrl } : {}),
      });
      router.refresh();
      return json.data ?? {};
    } catch {
      setResult({ tone: "error", message: "The request could not be sent" });
      return null;
    } finally {
      setBusy(null);
    }
  }

  const fields: ColumnPriorityField<LabRequisitionDto>[] = [
    {
      key: "patient",
      label: "Patient",
      priority: 1,
      cardPrimary: true,
      render: (r) => (
        <div className="min-w-0">
          <div className="truncate font-semibold">{r.patient.fullName ?? r.patient.email}</div>
          <div className="truncate text-xs text-[var(--color-muted)]">
            {r.patient.globalHealthNumber ?? r.patient.email}
          </div>
        </div>
      ),
    },
    {
      key: "status",
      label: "Status",
      priority: 1,
      render: (r) => <Pill tone={STATUS_TONES[r.status]}>{STATUS_LABELS[r.status]}</Pill>,
    },
    {
      key: "exams",
      label: "Exams",
      priority: 2,
      render: (r) => {
        const yes = r.items.filter((i) => i.patientAccepted).length;
        return (
          <span className="text-sm">
            {r.items.length}
            {yes > 0 && yes !== r.items.length ? (
              <span className="text-[var(--color-muted)]"> ({yes} confirmed)</span>
            ) : null}
          </span>
        );
      },
    },
    {
      key: "country",
      label: "Country",
      priority: 3,
      render: (r) => <span className="uppercase">{r.countryCode}</span>,
    },
    {
      key: "created",
      label: "Prescribed",
      priority: 3,
      render: (r) => <span className="text-sm">{fmtDate(r.createdAt)}</span>,
    },
  ];

  const acceptedIds = Object.entries(accepted)
    .filter(([, v]) => v)
    .map(([k]) => k);

  return (
    <>
      <ColumnPriorityTable
        fields={fields}
        rows={requisitions}
        getRowKey={(r) => r.id}
        onRowClick={openDrawer}
        getRowAriaLabel={(r) => `Open lab requisition for ${r.patient.fullName ?? r.patient.email}`}
        cardTone={(r) => STATUS_CARD_TONES[r.status]}
        emptyState={
          <AdminEmptyState
            title="No lab requisitions yet"
            description="When a doctor sends an exams prescription, it appears here so you can agree the tests with the patient and book them with the laboratory."
          />
        }
      />

      <RecordDetailsDrawer
        open={Boolean(selected)}
        onOpenChange={(open) => {
          if (!open) setOpenId(null);
        }}
        paramKey="requisition"
        paramValue={selected?.id}
        eyebrow="Lab requisition"
        title={selected ? (selected.patient.fullName ?? selected.patient.email) : ""}
        summary={
          selected ? (
            <div className="flex flex-wrap items-center gap-2">
              <Pill tone={STATUS_TONES[selected.status]}>{STATUS_LABELS[selected.status]}</Pill>
              <span className="text-xs text-[var(--color-muted)]">
                Prescribed {fmtDate(selected.createdAt)}
              </span>
            </div>
          ) : null
        }
      >
        {selected ? (
          <div className="space-y-5">
            {result ? (
              <div
                className={`rounded-md border px-3 py-2 text-sm ${
                  result.tone === "ok" ? "gh-status-success" : "gh-status-warning"
                }`}
                role="status"
              >
                <p>{result.message}</p>
                {result.url ? (
                  // Shown as text, not only opened: the operator may need to
                  // paste it into WebLIMS Browser to print sample labels.
                  <p className="mt-1 break-all font-mono text-xs">{result.url}</p>
                ) : null}
              </div>
            ) : null}

            <section className="space-y-2">
              <h3 className="text-sm font-semibold">Exams the doctor requested</h3>
              <ul className="space-y-1.5">
                {selected.items.map((item) => (
                  <li key={item.id} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      id={`item-${item.id}`}
                      checked={accepted[item.id] ?? false}
                      onChange={(e) =>
                        setAccepted((prev) => ({ ...prev, [item.id]: e.target.checked }))
                      }
                    />
                    <label htmlFor={`item-${item.id}`} className="flex-1 truncate">
                      {item.label}
                      {!item.examTypeId ? (
                        <span
                          className="ml-1.5 text-xs text-[var(--color-muted)]"
                          title="Typed by the doctor rather than picked from the catalogue, so it has no price"
                        >
                          (not in catalogue)
                        </span>
                      ) : null}
                    </label>
                    {item.unitPriceCents != null && item.currencyCode ? (
                      <span className="shrink-0 text-xs tabular-nums">
                        {fmtMoney(item.unitPriceCents, item.currencyCode)}
                      </span>
                    ) : null}
                  </li>
                ))}
              </ul>
              <Btn
                variant="secondary"
                size="sm"
                loading={busy === "confirm"}
                onClick={() =>
                  void post(selected.id, "confirm", { acceptedItemIds: acceptedIds })
                }
              >
                Save what the patient agreed
              </Btn>
            </section>

            <section className="space-y-2">
              <h3 className="text-sm font-semibold">Payment</h3>
              <p className="text-xs text-[var(--color-muted)]">
                Creates a self-pay order for the confirmed exams and returns a payment link
                to send the patient. Exams only get a price once they are confirmed against
                a collection centre that stocks them.
              </p>
              <Btn
                variant="secondary"
                size="sm"
                loading={busy === "payment-link"}
                onClick={() => void post(selected.id, "payment-link")}
              >
                Create payment link
              </Btn>
            </section>

            <section className="space-y-2">
              <h3 className="text-sm font-semibold">Synlab</h3>
              {!weblimsConfigured ? (
                <p className="gh-status-warning rounded-md border px-3 py-2 text-xs">
                  The WebLIMS connection is not configured yet, so requisitions cannot be
                  created. Set WEBLIMS_BASE_URL, WEBLIMS_CLIENT_ID and WEBLIMS_CLIENT_SECRET
                  once Synlab issues the credentials.
                </p>
              ) : (
                <p className="text-xs text-[var(--color-muted)]">
                  Opens the WebLIMS request form pre-filled with this patient. Choose the
                  methods there and save — then fetch them back to record what was ordered.
                </p>
              )}
              <div className="flex flex-wrap gap-2">
                <Btn
                  variant="primary"
                  size="sm"
                  disabled={!weblimsConfigured}
                  loading={busy === "weblims-form"}
                  onClick={async () => {
                    const data = await post(selected.id, "weblims-form");
                    const url = data && typeof data.showUrl === "string" ? data.showUrl : null;
                    if (url) window.open(url, "_blank", "noopener,noreferrer");
                  }}
                >
                  Open Synlab form
                </Btn>
                <Btn
                  variant="secondary"
                  size="sm"
                  disabled={!weblimsConfigured}
                  loading={busy === "methods"}
                  onClick={() => void post(selected.id, "methods")}
                >
                  Fetch ordered methods
                </Btn>
                <Btn
                  variant="secondary"
                  size="sm"
                  disabled={!weblimsConfigured}
                  loading={busy === "result-list"}
                  onClick={async () => {
                    const data = await post(selected.id, "result-list");
                    const url = data && typeof data.showUrl === "string" ? data.showUrl : null;
                    if (url) window.open(url, "_blank", "noopener,noreferrer");
                  }}
                >
                  View results in WebLIMS
                </Btn>
              </div>
              {selected.methodsText ? (
                <div className="rounded-md border border-[var(--color-border)] p-3">
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-[var(--color-muted)]">
                    Ordered methods
                  </h4>
                  <p className="mt-1 whitespace-pre-wrap text-sm">{selected.methodsText}</p>
                </div>
              ) : null}
            </section>

            <section className="space-y-2">
              <h3 className="text-sm font-semibold">Status</h3>
              <div className="flex flex-wrap gap-2">
                {(["SAMPLE_COLLECTED", "CLOSED", "CANCELLED"] as LabRequisitionStatus[]).map(
                  (status) => (
                    <Btn
                      key={status}
                      variant="ghost"
                      size="sm"
                      disabled={selected.status === status}
                      onClick={() => void post(selected.id, "status", { status })}
                    >
                      {STATUS_LABELS[status]}
                    </Btn>
                  ),
                )}
              </div>
            </section>
          </div>
        ) : null}
      </RecordDetailsDrawer>
    </>
  );
}
