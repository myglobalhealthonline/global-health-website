import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { prisma } from "../../db/prisma.js";

const execFileAsync = promisify(execFile);

// ── i18n labels ───────────────────────────────────────────────────────────────

const INVOICE_LABELS: Record<string, Record<string, string>> = {
  ie: {
    invoice: "Invoice",
    from: "From",
    billTo: "Billed to",
    description: "Description",
    qty: "Qty",
    unit: "Unit price",
    total: "Total",
    paid: "PAID",
    doctor: "Attending Doctor",
    reg: "Registration No.",
    company: "Global Health · Registered in Ireland · CRO No. 910267",
    address: "6-9 Trinity Street, Dublin 2, D02 EY47, Ireland",
    taxId: "Tax ID",
    consultationDate: "Consultation date",
    invoiceRef: "Invoice reference",
  },
  cz: {
    invoice: "Faktura",
    from: "Od",
    billTo: "Fakturováno",
    description: "Popis",
    qty: "Množství",
    unit: "Jedn. cena",
    total: "Celkem",
    paid: "ZAPLACENO",
    doctor: "Ošetřující lékař",
    reg: "Registrační číslo",
    company: "Global Health · Registrováno v Irsku · CRO č. 910267",
    address: "Irsko",
    taxId: "DIČ",
    consultationDate: "Datum konzultace",
    invoiceRef: "Číslo faktury",
  },
  sp: {
    invoice: "Factura",
    from: "De",
    billTo: "Facturado a",
    description: "Descripción",
    qty: "Cant.",
    unit: "Precio unitario",
    total: "Total",
    paid: "PAGADO",
    doctor: "Médico",
    reg: "Número de colegiado",
    company: "Global Health · Registrado en Irlanda · N.º CRO 910267",
    address: "Irlanda",
    taxId: "NIF",
    consultationDate: "Fecha de consulta",
    invoiceRef: "Referencia de factura",
  },
  rm: {
    invoice: "Factură",
    from: "De la",
    billTo: "Facturat către",
    description: "Descriere",
    qty: "Cant.",
    unit: "Preț unitar",
    total: "Total",
    paid: "ACHITAT",
    doctor: "Medic curant",
    reg: "Număr înregistrare",
    company: "Global Health · Înregistrată în Irlanda · CRO Nr. 910267",
    address: "Irlanda",
    taxId: "CUI",
    consultationDate: "Data consultației",
    invoiceRef: "Referință factură",
  },
};

function getL(countryCode: string) {
  return INVOICE_LABELS[countryCode.toLowerCase()] ?? INVOICE_LABELS.ie;
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface InvoicePdfData {
  invoiceNumber: string;
  invoiceDate: string; // ISO
  countryCode: string;
  order: {
    fullName: string;
    email: string;
    phone?: string | null;
    currencyCode: string;
    totalCents: number;
    subtotalCents: number;
    shippingCents: number;
    paidAt?: string | null;
    taxIdNumber?: string | null;
    consultationDate?: string | null;
    items: { name: string; quantity: number; unitPriceCents: number; lineTotalCents: number }[];
  };
  doctor?: {
    fullName: string;
    registrationNumber?: string | null;
    chamberEntity?: string | null;
  } | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function fmtMoney(cents: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-GB", { style: "currency", currency }).format(cents / 100);
  } catch {
    return `${(cents / 100).toFixed(2)} ${currency}`;
  }
}

function fmtDate(iso: string, locale = "en-GB"): string {
  return new Date(iso).toLocaleDateString(locale, {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

// ── HTML builder ──────────────────────────────────────────────────────────────

function buildInvoiceHtml(data: InvoicePdfData): string {
  const L = getL(data.countryCode);
  const { order } = data;
  const cur = order.currencyCode;

  const itemRows = order.items
    .map(
      (i) => `
    <tr>
      <td style="padding:10px 0;border-bottom:1px solid #eeeeee;">${esc(i.name)}</td>
      <td style="padding:10px 0;border-bottom:1px solid #eeeeee;text-align:center;">${i.quantity}</td>
      <td style="padding:10px 0;border-bottom:1px solid #eeeeee;text-align:right;">${fmtMoney(i.unitPriceCents, cur)}</td>
      <td style="padding:10px 0;border-bottom:1px solid #eeeeee;text-align:right;">${fmtMoney(i.lineTotalCents, cur)}</td>
    </tr>`,
    )
    .join("");

  const shippingRow =
    order.shippingCents > 0
      ? `<tr>
          <td colspan="3" style="padding:8px 0;text-align:right;color:#555555;font-size:12px;border-top:1px solid #dddddd;">Shipping</td>
          <td style="padding:8px 0;text-align:right;color:#555555;font-size:12px;">${fmtMoney(order.shippingCents, cur)}</td>
        </tr>`
      : "";

  const doctorBlock = data.doctor
    ? `<div style="margin-bottom:28px;padding:12px 16px;background:#f4f7f5;border-left:3px solid #1B4D3E;">
        <p style="margin:0 0 4px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.14em;color:#555555;">${L.doctor}</p>
        <p style="margin:0;font-weight:600;font-size:13px;">${esc(data.doctor.fullName)}</p>
        ${
          data.doctor.chamberEntity && data.doctor.registrationNumber
            ? `<p style="margin:2px 0 0;font-size:12px;color:#555555;">${esc(data.doctor.chamberEntity)} · ${L.reg}: ${esc(data.doctor.registrationNumber)}</p>`
            : data.doctor.registrationNumber
              ? `<p style="margin:2px 0 0;font-size:12px;color:#555555;">${L.reg}: ${esc(data.doctor.registrationNumber)}</p>`
              : ""
        }
      </div>`
    : "";

  const phoneRow = order.phone
    ? `<p style="margin:2px 0 0;font-size:12px;color:#555555;">${esc(order.phone)}</p>`
    : "";

  const taxIdRow = order.taxIdNumber
    ? `<p style="margin:2px 0 0;font-size:12px;color:#555555;">${L.taxId}: ${esc(order.taxIdNumber)}</p>`
    : "";

  const consultDateRow = order.consultationDate
    ? `<p style="margin:2px 0 0;font-size:12px;color:#555555;">${L.consultationDate}: ${fmtDate(order.consultationDate)}</p>`
    : "";

  const paidAtStr = order.paidAt
    ? ` · Paid ${new Date(order.paidAt).toLocaleDateString("en-GB")}`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>${esc(L.invoice)} ${esc(data.invoiceNumber)}</title>
</head>
<body style="font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#111111;max-width:700px;margin:0 auto;padding:32px;line-height:1.5;">

<!-- Header -->
<table style="width:100%;border-collapse:collapse;border-bottom:2px solid #1B4D3E;margin-bottom:32px;">
  <tr>
    <td style="vertical-align:top;padding-bottom:20px;">
      <div style="font-size:22px;font-weight:800;color:#1B4D3E;">Global Health</div>
      <div style="font-size:11px;color:#555555;margin-top:8px;line-height:1.5;">
        ${L.company}<br>${L.address}
      </div>
    </td>
    <td style="vertical-align:top;text-align:right;padding-bottom:20px;">
      <div style="font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:#1B4D3E;font-weight:700;">${L.invoice}</div>
      <div style="font-size:24px;font-weight:800;color:#1B4D3E;margin-top:6px;">${esc(data.invoiceNumber)}</div>
      <div style="font-size:12px;color:#555555;margin-top:8px;">${fmtDate(data.invoiceDate)}</div>
      <div style="margin-top:10px;padding:3px 10px;background:#d1fae5;color:#065f46;font-size:11px;font-weight:700;display:inline-block;">${L.paid}</div>
    </td>
  </tr>
</table>

<!-- Billing parties -->
<table style="width:100%;border-collapse:collapse;margin-bottom:32px;">
  <tr>
    <td style="width:50%;vertical-align:top;padding-right:16px;">
      <p style="margin:0 0 6px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.14em;color:#888888;">${L.from}</p>
      <p style="margin:0;font-weight:700;font-size:14px;">Global Health</p>
      <p style="margin:2px 0 0;font-size:12px;color:#555555;">${L.address}</p>
      <p style="margin:2px 0 0;font-size:12px;color:#555555;">info@myglobalhealth.online</p>
    </td>
    <td style="width:50%;vertical-align:top;padding-left:16px;">
      <p style="margin:0 0 6px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.14em;color:#888888;">${L.billTo}</p>
      <p style="margin:0;font-weight:700;font-size:14px;">${esc(order.fullName)}</p>
      <p style="margin:2px 0 0;font-size:12px;color:#555555;">${esc(order.email)}</p>
      ${phoneRow}${taxIdRow}${consultDateRow}
    </td>
  </tr>
</table>

<!-- Doctor block -->
${doctorBlock}

<!-- Line items -->
<table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:8px;">
  <thead>
    <tr style="border-bottom:2px solid #1B4D3E;">
      <th style="text-align:left;padding:6px 0 8px;font-size:10px;text-transform:uppercase;letter-spacing:0.1em;color:#555555;font-weight:700;">${L.description}</th>
      <th style="text-align:center;padding:6px 0 8px;width:50px;font-size:10px;text-transform:uppercase;letter-spacing:0.1em;color:#555555;font-weight:700;">${L.qty}</th>
      <th style="text-align:right;padding:6px 0 8px;width:110px;font-size:10px;text-transform:uppercase;letter-spacing:0.1em;color:#555555;font-weight:700;">${L.unit}</th>
      <th style="text-align:right;padding:6px 0 8px;width:110px;font-size:10px;text-transform:uppercase;letter-spacing:0.1em;color:#555555;font-weight:700;">${L.total}</th>
    </tr>
  </thead>
  <tbody>${itemRows}</tbody>
  <tfoot>
    ${shippingRow}
    <tr style="border-top:2px solid #1B4D3E;">
      <td colspan="3" style="text-align:right;padding:12px 0;font-weight:700;font-size:14px;">${L.total}</td>
      <td style="text-align:right;padding:12px 0;font-weight:800;font-size:16px;color:#1B4D3E;">${fmtMoney(order.totalCents, cur)}</td>
    </tr>
  </tfoot>
</table>

<!-- Reference -->
<p style="margin-top:24px;font-size:11px;color:#888888;">
  ${L.invoiceRef}: <strong>${esc(data.invoiceNumber)}</strong>${paidAtStr}
</p>

<!-- Footer -->
<div style="margin-top:48px;padding-top:16px;border-top:1px solid #e5e5e3;font-size:11px;color:#888888;text-align:center;">
  Global Health · Medicine Anytime Anywhere
</div>

</body>
</html>`;
}

// ── soffice ───────────────────────────────────────────────────────────────────

async function resolveSofficeBinary(): Promise<string | null> {
  const candidates = [
    process.env.LIBREOFFICE_PATH,
    "soffice",
    "libreoffice",
    "C:\\Program Files\\LibreOffice\\program\\soffice.exe",
    "C:\\Program Files (x86)\\LibreOffice\\program\\soffice.exe",
  ].filter((b): b is string => Boolean(b));
  for (const bin of candidates) {
    try {
      await execFileAsync(bin, ["--version"]);
      return bin;
    } catch {
      /* next */
    }
  }
  return null;
}

export async function renderInvoicePdfBuffer(data: InvoicePdfData): Promise<Buffer | null> {
  const soffice = await resolveSofficeBinary();
  if (!soffice) return null;

  const html = buildInvoiceHtml(data);
  const workDir = await mkdtemp(path.join(tmpdir(), "gh-inv-"));
  const htmlPath = path.join(workDir, "invoice.html");
  try {
    await writeFile(htmlPath, html, "utf-8");
    await execFileAsync(soffice, [
      "--headless",
      "--norestore",
      "--convert-to",
      "pdf",
      "--outdir",
      workDir,
      htmlPath,
    ]);
    return await readFile(path.join(workDir, "invoice.pdf"));
  } catch {
    return null;
  } finally {
    await rm(workDir, { recursive: true, force: true }).catch(() => {});
  }
}

// ── Data fetcher ──────────────────────────────────────────────────────────────

export async function buildInvoicePdfData(
  orderId: string,
  invoiceNumber: string,
  invoiceDate: string,
): Promise<InvoicePdfData | null> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      fullName: true,
      email: true,
      phone: true,
      countryCode: true,
      currencyCode: true,
      totalCents: true,
      subtotalCents: true,
      shippingCents: true,
      paidAt: true,
      items: {
        select: {
          name: true,
          quantity: true,
          unitPriceCents: true,
          lineTotalCents: true,
          doctorId: true,
          appointmentId: true,
          kind: true,
        },
      },
    },
  });
  if (!order) return null;

  const profile = await prisma.patientProfile.findUnique({
    where: { email: order.email.toLowerCase() },
    select: { taxIdNumber: true },
  });

  const consultItem = order.items.find(
    (i) =>
      (i.kind === "GENERAL_CONSULTATION" || i.kind === "SPECIALIST_CONSULTATION") && i.doctorId,
  );

  let consultationDate: string | null = null;
  if (consultItem?.appointmentId) {
    const appt = await prisma.appointment.findUnique({
      where: { id: consultItem.appointmentId },
      select: { scheduledAt: true },
    });
    consultationDate = appt?.scheduledAt?.toISOString() ?? null;
  }

  let doctor: InvoicePdfData["doctor"] = null;
  if (consultItem?.doctorId) {
    const doctorRow = await prisma.doctor.findUnique({
      where: { id: consultItem.doctorId },
      select: {
        fullName: true,
        country: { select: { code: true } },
        additionalCountries: {
          select: {
            registrationNumber: true,
            chamberEntity: true,
            country: { select: { code: true } },
          },
        },
      },
    });
    if (doctorRow) {
      const cc = order.countryCode.toLowerCase();
      const allRegs = [
        {
          code: doctorRow.country.code.toLowerCase(),
          registrationNumber: null as string | null,
          chamberEntity: null as string | null,
        },
        ...doctorRow.additionalCountries.map((dc) => ({
          code: dc.country.code.toLowerCase(),
          registrationNumber: dc.registrationNumber,
          chamberEntity: dc.chamberEntity,
        })),
      ];
      const matched = allRegs.find((r) => r.code === cc);
      let regNumber = matched?.registrationNumber ?? null;
      let chamberEntity = matched?.chamberEntity ?? null;
      if (!regNumber) {
        const dc = await prisma.doctorCountry.findFirst({
          where: {
            doctorId: consultItem.doctorId,
            country: { code: { equals: cc, mode: "insensitive" } },
          },
          select: { registrationNumber: true, chamberEntity: true },
        });
        regNumber = dc?.registrationNumber ?? null;
        chamberEntity = dc?.chamberEntity ?? null;
      }
      doctor = { fullName: doctorRow.fullName, registrationNumber: regNumber, chamberEntity };
    }
  }

  return {
    invoiceNumber,
    invoiceDate,
    countryCode: order.countryCode,
    order: {
      fullName: order.fullName,
      email: order.email,
      phone: order.phone,
      currencyCode: order.currencyCode,
      totalCents: order.totalCents,
      subtotalCents: order.subtotalCents,
      shippingCents: order.shippingCents,
      paidAt: order.paidAt?.toISOString() ?? null,
      taxIdNumber: profile?.taxIdNumber ?? null,
      consultationDate,
      items: order.items.map((i) => ({
        name: i.name,
        quantity: i.quantity,
        unitPriceCents: i.unitPriceCents,
        lineTotalCents: i.lineTotalCents,
      })),
    },
    doctor,
  };
}
