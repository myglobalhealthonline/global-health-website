import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import PizZip from "pizzip";
import {
  docxFilename,
  templatePrefixForCountry,
} from "./docx-template-profiles.js";
import { resolveDocxTemplatePath, DOCX_TEMPLATES_ROOT } from "./docx-document-renderer.js";

describe("docx template resolution", () => {
  it("maps ie to IR prefix", () => {
    assert.equal(templatePrefixForCountry("ie"), "IR");
  });

  it("maps sp to ES prefix", () => {
    assert.equal(templatePrefixForCountry("sp"), "ES");
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
