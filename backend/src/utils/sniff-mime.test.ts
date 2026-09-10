import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { sniffFileMime, verifySniffedMime } from "./sniff-mime.js";

const PDF = Buffer.from("%PDF-1.4 fixture bytes");
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
const PDF_ONLY = new Set(["application/pdf"]);

describe("upload MIME verification", () => {
  it("identifies a type from its magic bytes", () => {
    assert.equal(sniffFileMime(PDF), "application/pdf");
    assert.equal(sniffFileMime(PNG), "image/png");
    assert.equal(sniffFileMime(Buffer.from("not a known file type")), null);
    assert.equal(sniffFileMime(Buffer.from("%PDF")), null, "under 12 bytes is not sniffable");
  });

  it("accepts an allowed type whatever the browser called it", () => {
    // The declared Content-Type is not an argument any more. It is the OS's
    // guess - empty for a genuine PDF on Windows with no registered handler,
    // application/octet-stream from most phone pickers - and an attacker sets
    // it to whatever passes, so matching on it only ever turned away honest
    // uploads.
    assert.equal(verifySniffedMime(PDF, PDF_ONLY), "application/pdf");
  });

  it("still refuses content whose real type is not allowed", () => {
    assert.equal(verifySniffedMime(PNG, PDF_ONLY), null);
    assert.equal(verifySniffedMime(Buffer.from("<script>alert(1)</script>"), PDF_ONLY), null);
    assert.equal(verifySniffedMime(PDF, new Set(["image/png"])), null);
  });
});
