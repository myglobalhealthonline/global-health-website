declare const request: any;
declare function respondToAccessRequest(input: Record<string, unknown>): unknown;

// ruleid: gh-patient-response-missing-owner
respondToAccessRequest({
  requestId: request.params.id,
  approved: true,
  patientResponseIp: request.ip,
});

// ok: gh-patient-response-missing-owner
respondToAccessRequest({
  requestId: request.params.id,
  patientProfileId: "patient-profile-from-authenticated-user",
  approved: true,
  patientResponseIp: request.ip,
});
