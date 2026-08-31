import { describe, expect, it } from "vitest";
import { buildDoctorProfilePath } from "./doctor-profile-path";

describe("buildDoctorProfilePath", () => {
  it("keeps the article locale for Czech doctor-profile links", () => {
    expect(buildDoctorProfilePath("czechia", "cs", "mudr-romana-pavlu")).toBe(
      "/czechia/cs/doctors/mudr-romana-pavlu",
    );
  });

  it("normalizes locale casing", () => {
    expect(buildDoctorProfilePath("ireland", "EN", "dr-ahmed-maklad")).toBe(
      "/ireland/en/doctors/dr-ahmed-maklad",
    );
  });

  it("fails closed when the doctor has no market slug", () => {
    expect(buildDoctorProfilePath(null, "cs", "mudr-romana-pavlu")).toBeNull();
  });
});
