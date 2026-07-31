import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  adminDoctorCreateBodySchema,
  adminDoctorUpdateBodySchema,
  adminDoctorsQuerySchema,
  doctorSlugSchema,
  profileImageRefSchema,
} from "../../validations/admin-doctors.schema.js";

describe("admin doctors validation", () => {
  it("rejects invalid slug characters", () => {
    assert.equal(doctorSlugSchema.safeParse("Dr_Name").success, false);
    assert.equal(doctorSlugSchema.safeParse("DR-SLUG").success, false);
    assert.equal(doctorSlugSchema.safeParse("dr-jane-smith").success, true);
  });

  it("create rejects missing title", () => {
    const result = adminDoctorCreateBodySchema.safeParse({
      countryId: "c1",
      slug: "dr-smith",
      fullName: "Jane Smith",
      title: "",
    });
    assert.equal(result.success, false);
  });

  it("create rejects missing fullName", () => {
    const result = adminDoctorCreateBodySchema.safeParse({
      countryId: "c1",
      slug: "dr-smith",
      fullName: "",
      title: "MD",
    });
    assert.equal(result.success, false);
  });

  it("profile image rejects http URL (https or path only)", () => {
    const http = profileImageRefSchema.safeParse("http://example.com/a.jpg");
    assert.equal(http.success, false);
    const https = profileImageRefSchema.safeParse("https://cdn.example.com/a.jpg");
    assert.equal(https.success, true);
    const path = profileImageRefSchema.safeParse("/media/doctors/a.jpg");
    assert.equal(path.success, true);
  });

  it("profile image rejects path without leading slash", () => {
    const result = profileImageRefSchema.safeParse("relative/path.jpg");
    assert.equal(result.success, false);
  });

  it("create accepts valid payload", () => {
    const result = adminDoctorCreateBodySchema.safeParse({
      countryId: "c1",
      slug: "dr-jane-smith",
      fullName: "Jane Smith",
      title: "Consultant Physician",
      bio: "Bio text",
      imcRegistration: "IMC-542074",
      whatsappNumber: "+353871234567",
      languages: ["English", "Portuguese"],
      specialtyIds: [],
      profileImagePath: "https://cdn.example.com/p.jpg",
      active: true,
    });
    assert.equal(result.success, true);
  });

  it("query schema parses filters and pagination", () => {
    const result = adminDoctorsQuerySchema.safeParse({
      page: "3",
      pageSize: "25",
      countryCode: "ie",
      serviceKind: "GENERAL",
      isActive: "true",
      search: "smith",
    });
    assert.equal(result.success, true);
    if (result.success) {
      assert.equal(result.data.page, 3);
      assert.equal(result.data.pageSize, 25);
      assert.equal(result.data.countryCode, "ie");
      assert.equal(result.data.serviceKind, "GENERAL");
      assert.equal(result.data.isActive, true);
      assert.equal(result.data.search, "smith");
    }
  });

  it("update round-trips the country-director flag and its per-country grants", () => {
    const result = adminDoctorUpdateBodySchema.safeParse({
      isCountryDirector: true,
      directorCountryIds: ["country-pt", "country-br"],
    });
    assert.equal(result.success, true);
    if (result.success) {
      assert.equal(result.data.isCountryDirector, true);
      assert.deepEqual(result.data.directorCountryIds, ["country-pt", "country-br"]);
    }
  });

  it("update accepts an empty directorCountryIds array (revokes every grant)", () => {
    // Distinct from omitting the key, which leaves existing grants untouched —
    // the admin form always sends the array so unticking the last country sticks.
    const cleared = adminDoctorUpdateBodySchema.safeParse({ directorCountryIds: [] });
    assert.equal(cleared.success, true);
    if (cleared.success) assert.deepEqual(cleared.data.directorCountryIds, []);

    const omitted = adminDoctorUpdateBodySchema.safeParse({ isCountryDirector: false });
    assert.equal(omitted.success, true);
    if (omitted.success) assert.equal(omitted.data.directorCountryIds, undefined);
  });

  it("update rejects a non-boolean director flag and blank country ids", () => {
    assert.equal(
      adminDoctorUpdateBodySchema.safeParse({ isCountryDirector: "on" }).success,
      false,
    );
    assert.equal(
      adminDoctorUpdateBodySchema.safeParse({ directorCountryIds: [""] }).success,
      false,
    );
  });

  it("duplicate slug is enforced by DB unique constraint (countryId + slug), not Zod", () => {
    const a = adminDoctorCreateBodySchema.safeParse({
      countryId: "c1",
      slug: "same-slug",
      fullName: "A",
      title: "MD",
    });
    const b = adminDoctorCreateBodySchema.safeParse({
      countryId: "c1",
      slug: "same-slug",
      fullName: "B",
      title: "MD",
    });
    assert.equal(a.success, true);
    assert.equal(b.success, true);
  });
});
