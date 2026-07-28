import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import PizZip from "pizzip";
import {
  docxFilename,
  labelPrefixForCountry,
  templatePrefixForCountry,
} from "./docx-template-profiles.js";
import { labelsForPrefix, TEMPLATE_LABELS } from "./docx-template-labels.js";
import { resolveDocxTemplatePath, DOCX_TEMPLATES_ROOT } from "./docx-document-renderer.js";

describe("docx template resolution", () => {
  it("maps ie to IR prefix", () => {
    assert.equal(templatePrefixForCountry("ie"), "IR");
  });

  it("maps sp to ES prefix", () => {
    assert.equal(templatePrefixForCountry("sp"), "ES");
  });

  it("maps es to ES prefix", () => {
    assert.equal(templatePrefixForCountry("es"), "ES");
  });

  it("builds expected filenames", () => {
    assert.equal(
      docxFilename("PT", "EXAMS_PRESCRIPTION"),
      "(PT) Exams Template _ Global Health.docx",
    );
  });

  it("resolves PT exams template on disk when assets synced", () => {
    if (!fs.existsSync(DOCX_TEMPLATES_ROOT)) return;
    const p = resolveDocxTemplatePath("pt", "EXAMS_PRESCRIPTION");
    assert.ok(p);
    assert.ok(fs.existsSync(p!));
  });

  // Brazil had no entry at all, so `templatePrefixForCountry("br")` returned
  // null and every caller fell back to "IR" — which is why Brazilian
  // prescriptions came out in English.
  it("has no DOCX template for br", () => {
    assert.equal(templatePrefixForCountry("br"), null);
  });

  it("resolves br to the BR label set", () => {
    assert.equal(labelPrefixForCountry("br"), "BR");
    assert.equal(labelPrefixForCountry("BR"), "BR");
  });

  it("does not put br on Portugal's Word template", () => {
    // Aliasing br -> PT would localize the text but print Brazilian documents
    // on the Portuguese clinic's stationery.
    assert.notEqual(labelPrefixForCountry("br"), "PT");
  });

  it("keeps DOCX markets resolving to their own label set", () => {
    assert.equal(labelPrefixForCountry("pt"), "PT");
    assert.equal(labelPrefixForCountry("ie"), "IR");
    assert.equal(labelPrefixForCountry("cz"), "CZ");
  });

  it("falls back to English for an unknown market", () => {
    assert.equal(labelPrefixForCountry("xx"), "IR");
    assert.equal(labelPrefixForCountry(""), "IR");
  });

  it("writes Brazilian documents in Portuguese", () => {
    const L = labelsForPrefix(labelPrefixForCountry("br"));
    assert.equal(L.docTitlePrescription, "Receita Médica");
    // BR says atestado, PT says certificado de incapacidade — not an alias.
    assert.equal(L.docTitleAbsence, "Atestado Médico");
    assert.notEqual(L.docTitleAbsence, TEMPLATE_LABELS.PT.docTitleAbsence);
    assert.equal(L.address, "Endereço");
  });

  it("localizes every label set, leaving no English in a non-English document", () => {
    for (const [prefix, labels] of Object.entries(TEMPLATE_LABELS)) {
      if (prefix === "IR") continue;
      assert.notEqual(
        labels.registrationUnverified,
        TEMPLATE_LABELS.IR.registrationUnverified,
        `${prefix} still prints the English "unverified"`,
      );
      assert.notEqual(
        labels.docTitlePrescription,
        TEMPLATE_LABELS.IR.docTitlePrescription,
        `${prefix} still prints the English prescription title`,
      );
    }
  });

  it("template DOCX includes logo media and header (layout preserved)", () => {
    const p = resolveDocxTemplatePath("ie", "EXAMS_PRESCRIPTION");
    if (!p || !fs.existsSync(p)) return;
    const buf = fs.readFileSync(p);
    const zip = new PizZip(buf);
    const media = Object.keys(zip.files).filter((k) => k.startsWith("word/media/"));
    assert.ok(media.length >= 1, "expected logo images in word/media/");
    assert.ok(zip.file("word/header1.xml"), "expected branded header");
  });
});
