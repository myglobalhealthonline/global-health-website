import assert from "node:assert/strict";
import test from "node:test";

import { addressToPath, summariseWsdl,
  toFetchableImportPath,
} from "./wsdl.js";

/**
 * The WSDL reader is a diagnostic, so these tests pin the two things a human
 * will actually act on: the published `soap:address` (which becomes the path
 * argument to suklPost) and the operation list.
 *
 * The sample below is shaped after the SÚKL doctor-eRecept WSDL published in a
 * third-party repository — same element shapes and prefixes, trimmed. It is a
 * fixture for the parser, NOT a source of truth about ePoukaz.
 */
const SAMPLE = `<?xml version="1.0" encoding="UTF-8"?>
<wsdl:definitions xmlns:wsdl="http://schemas.xmlsoap.org/wsdl/"
                  xmlns:soap="http://schemas.xmlsoap.org/wsdl/soap/"
                  xmlns:tns="http://www.sukl.cz/erp/201704"
                  targetNamespace="http://www.sukl.cz/erp/201704">
  <!--202201A-->
  <wsdl:import location="https://example.test/types.wsdl" namespace="urn:x"/>
  <wsdl:portType name="CUERLekar_PortType">
    <wsdl:operation name="ZalozitPredpis"><wsdl:input message="tns:a"/></wsdl:operation>
    <wsdl:operation name="AppPing"><wsdl:input message="tns:b"/></wsdl:operation>
  </wsdl:portType>
  <wsdl:binding name="CUERLekar_Binding" type="tns:CUERLekar_PortType">
    <soap:binding style="document" transport="http://schemas.xmlsoap.org/soap/http"/>
    <wsdl:operation name="ZalozitPredpis">
      <soap:operation soapAction="ZalozitPredpis"/>
    </wsdl:operation>
  </wsdl:binding>
  <wsdl:service name="CUERLekar">
    <wsdl:port name="CUERLekar_Port" binding="tns:CUERLekar_Binding">
      <soap:address location="https://lekar-soap.test-erecept.sukl.cz/cuer/Lekar"/>
    </wsdl:port>
  </wsdl:service>
</wsdl:definitions>`;

test("extracts the published address, namespace, operations and SOAP version", () => {
  const s = summariseWsdl(SAMPLE);
  assert.equal(s.looksLikeWsdl, true);
  assert.equal(s.targetNamespace, "http://www.sukl.cz/erp/201704");
  // SÚKL publish BOTH bindings; the reader reports both, 1.1 first because
  // that is the one the transport sends.
  assert.deepEqual(s.soapVersions, ["1.1"]);
  assert.equal(s.interfaceVersion, "202201A");
  assert.deepEqual(s.services, ["CUERLekar"]);
  assert.deepEqual(s.addresses, ["https://lekar-soap.test-erecept.sukl.cz/cuer/Lekar"]);
  assert.deepEqual(s.ports, [
    { name: "CUERLekar_Port", binding: "tns:CUERLekar_Binding" },
  ]);
  // Operations appear in both portType and binding; the reader de-duplicates.
  assert.deepEqual(s.operations, ["ZalozitPredpis", "AppPing"]);
  assert.deepEqual(s.imports, ["https://example.test/types.wsdl"]);
  assert.equal(s.namespaces.soap, "http://schemas.xmlsoap.org/wsdl/soap/");
});

test("recognises SOAP 1.2, and reports both when both are published", () => {
  assert.deepEqual(summariseWsdl(SAMPLE.replace("wsdl/soap/", "wsdl/soap12/")).soapVersions, [
    "1.2",
  ]);
  // SÚKL's real WSDLs declare soap AND soap12 — the reader must not collapse
  // that to whichever it noticed last.
  const both = SAMPLE.replace(
    'xmlns:soap="http://schemas.xmlsoap.org/wsdl/soap/"',
    'xmlns:soap="http://schemas.xmlsoap.org/wsdl/soap/" xmlns:soap12="http://schemas.xmlsoap.org/wsdl/soap12/"',
  );
  assert.deepEqual(summariseWsdl(both).soapVersions, ["1.1", "1.2"]);
});

test("extracts the interface version from SÚKL's XML comment", () => {
  // The value the Zprava header must carry. Not negotiated — a wrong one is
  // rejected — so it is worth pulling out of 150 KB of XML explicitly.
  assert.equal(summariseWsdl("<!--202601B--><wsdl:definitions/>").interfaceVersion, "202601B");
  assert.equal(summariseWsdl("<!-- 202605A --><wsdl:definitions/>").interfaceVersion, "202605A");
  // A version-shaped string that is not in the comment form must be ignored.
  assert.equal(summariseWsdl("<wsdl:definitions x=\"202601B\"/>").interfaceVersion, null);
});

test("a non-WSDL response is reported as such rather than half-parsed", () => {
  const s = summariseWsdl("<html><body>404 Not Found</body></html>");
  assert.equal(s.looksLikeWsdl, false);
  assert.deepEqual(s.addresses, []);
  assert.deepEqual(s.operations, []);
});

test("addressToPath converts a published address into a request path", () => {
  assert.equal(
    addressToPath(
      "https://cuep-soap.test-erecept.sukl.cz/cuep/Poukaz",
      "https://cuep-soap.test-erecept.sukl.cz",
    ),
    "/cuep/Poukaz",
  );
  // Query strings are part of the endpoint and must survive.
  assert.equal(
    addressToPath("https://h.test/svc?v=19", "https://h.test"),
    "/svc?v=19",
  );
});

test("addressToPath refuses to rewrite an address on a different host", () => {
  // Silently rewriting would point requests at a host we never configured and
  // never verified — the caller must see this and decide.
  assert.equal(
    addressToPath("https://somewhere-else.sukl.cz/cuep/Poukaz", "https://cuep-soap.test-erecept.sukl.cz"),
    null,
  );
  assert.equal(addressToPath("not a url", "https://h.test"), null);
});

test("an import URL becomes a path we can actually fetch", () => {
  // CUER's real import, read 2026-09-05. T-NERP-GW01 is an internal hostname
  // that does not resolve from outside, but the public proxy serves the same
  // document off the service root by query string — exactly as it serves
  // /?wsdl while soap:address points somewhere unreachable.
  assert.equal(
    toFetchableImportPath(
      "https://T-NERP-GW01/soap/CuerSoapService.asmx?xsd=cuer.xsd",
    ),
    "/?xsd=cuer.xsd",
  );
  assert.equal(toFetchableImportPath("CommonSchema.xsd"), "/CommonSchema.xsd");
});

test("nothing that could redirect the client certificate is derivable", () => {
  // The facility certificate is presented on this fetch, so a host we did not
  // configure must yield null rather than a guess.
  assert.equal(toFetchableImportPath("https://evil.example/x.xsd"), null);
  assert.equal(toFetchableImportPath("//evil.example/x.xsd"), null);
  assert.equal(toFetchableImportPath(""), null);
  assert.equal(toFetchableImportPath("   "), null);
});
