import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import PizZip from "pizzip";
import {
  buildLabelValueLine,
  buildPrescriberSignatureLine,
  injectProfessionalLayout,
} from "./docx-xml-builder.js";
import { buildPatientBodyGapXml, PATIENT_BODY_GAP_LINES } from "./docx-page-layout.js";
import { SIGNATURE_FONT } from "./docx-alex-brush-font.js";
import { profileForPrefix } from "./docx-template-profiles.js";

describe("docx-xml-builder", () => {
  it("buildPrescriberSignatureLine uses Alex Brush after registration order in layout", () => {
    const sig = buildPrescriberSignatureLine(
      { signatureLine: "Prescriber signature" } as import("./docx-template-labels.js").TemplateLabels,
      "Dr Jane",
    );
    assert.ok(sig.includes(SIGNATURE_FONT));
    assert.ok(sig.includes("Dr Jane"));
    assert.equal((buildPatientBodyGapXml().match(/<w:p[\s>]/g) || []).length, PATIENT_BODY_GAP_LINES);
  });

  it("buildLabelValueLine uses bold brand-colored label", () => {
    const xml = buildLabelValueLine("Patient name", "Jane Doe");
    assert.ok(xml.includes("<w:b w:val="));
    assert.ok(xml.includes('w:color w:val="1D4B36"'));
    assert.ok(xml.includes("Jane Doe"));
  });

  it("injectProfessionalLayout removes legacy Note and uses table", () => {
    const path =
      "c:/Users/nauma/Desktop/Global Website/global-health-website/Templates/(ES) Absence Certificate Template _ Global Health.docx";
    if (!fs.existsSync(path)) return;
    const profile = profileForPrefix("ES");
    if (!profile) return;
    const raw = new PizZip(fs.readFileSync(path)).file("word/document.xml")!.asText();
    const out = injectProfessionalLayout(raw, profile, "ABSENCE_CERTIFICATE", {
      patientName: "Carlos García",
      birthDate: "01/11/1990",
      address: "Madrid",
      consultationDate: "31/05/2026",
      doctorName: "Dr Ruiz",
      registrationNumber: "OM 999",
      startDate: "01/06/2026",
      endDate: "05/06/2026",
      reason: "Medical rest",
    });
    const text = [...out.matchAll(/<w:t[^>]*>([^<]*)<\/w:t>/g)].map((m) => m[1]).join("\n");
    assert.equal(text.includes("Nota:"), false);
    assert.ok(out.includes("<w:tbl>"));
    assert.equal(/<w:p[^>]*>\s*<w:tbl>/.test(out), false);
    assert.ok(text.includes("Desde:"));
    assert.ok(text.includes("Hasta:"));
  });
});
